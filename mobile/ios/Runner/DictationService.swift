import AVFoundation
import ActivityKit
import Foundation

class DictationService {
    static let shared = DictationService()

    private var audioEngine: AVAudioEngine?
    private var audioFile: AVAudioFile?
    private var activityRef: Any?
    private var elapsedTimer: Timer?
    private var startTime: Date?

    @available(iOS 16.2, *)
    private var activity: Activity<DictationAttributes>? {
        get { activityRef as? Activity<DictationAttributes> }
        set { activityRef = newValue }
    }

    private let defaults = UserDefaults(suiteName: DictationConstants.appGroupId)

    private init() {}

    var currentPhase: DictationPhase {
        let raw = defaults?.string(forKey: DictationConstants.phaseKey) ?? "idle"
        return DictationPhase(rawValue: raw) ?? .idle
    }

    func startDictation(toneId: String?, language: String?) {
        NSLog("[VoquillApp] startDictation toneId=%@ language=%@", toneId ?? "nil", language ?? "nil")

        defaults?.set(toneId, forKey: DictationConstants.toneIdKey)
        if let language = language {
            defaults?.set(language, forKey: "voquill_dictation_language")
        }
        defaults?.removeObject(forKey: DictationConstants.resultKey)
        defaults?.removeObject(forKey: DictationConstants.errorKey)
        defaults?.removeObject(forKey: DictationConstants.rawTranscriptKey)

        let now = Date().timeIntervalSince1970
        defaults?.set(now, forKey: DictationConstants.startedAtKey)
        setPhase(.recording)

        do {
            try configureAudioSession()
            try startAudioEngine()
        } catch {
            NSLog("[VoquillApp] Audio setup failed: %@", error.localizedDescription)
            failWithError("Audio setup failed: \(error.localizedDescription)")
            return
        }

        startLiveActivity()
        startElapsedTimer()

        DarwinNotificationManager.shared.observe(DictationConstants.stopDictation) { [weak self] in
            self?.stopDictation()
        }
    }

    func stopDictation() {
        NSLog("[VoquillApp] stopDictation")
        DarwinNotificationManager.shared.removeObserver(DictationConstants.stopDictation)

        stopElapsedTimer()
        stopAudioEngine()
        setPhase(.processing)

        Task {
            await transcribeAndDeliver()
        }
    }

    private func configureAudioSession() throws {
        let session = AVAudioSession.sharedInstance()
        try session.setCategory(.record, mode: .default)
        try session.setActive(true)
    }

    private func startAudioEngine() throws {
        let engine = AVAudioEngine()
        let inputNode = engine.inputNode
        let format = inputNode.outputFormat(forBus: 0)

        let containerUrl = FileManager.default.containerURL(
            forSecurityApplicationGroupIdentifier: DictationConstants.appGroupId
        )
        let audioUrl = containerUrl?.appendingPathComponent("dictation_recording.m4a")
            ?? FileManager.default.temporaryDirectory.appendingPathComponent("dictation_recording.m4a")
        try? FileManager.default.removeItem(at: audioUrl)

        let settings: [String: Any] = [
            AVFormatIDKey: Int(kAudioFormatMPEG4AAC),
            AVSampleRateKey: format.sampleRate,
            AVNumberOfChannelsKey: 1,
            AVEncoderAudioQualityKey: AVAudioQuality.medium.rawValue
        ]
        let file = try AVAudioFile(forWriting: audioUrl, settings: settings)
        self.audioFile = file

        inputNode.installTap(onBus: 0, bufferSize: 4096, format: format) { buffer, _ in
            try? file.write(from: buffer)
        }

        engine.prepare()
        try engine.start()
        self.audioEngine = engine
    }

    private func stopAudioEngine() {
        audioEngine?.inputNode.removeTap(onBus: 0)
        audioEngine?.stop()
        audioEngine = nil
        audioFile = nil
        try? AVAudioSession.sharedInstance().setActive(false, options: .notifyOthersOnDeactivation)
    }

    private func transcribeAndDeliver() async {
        do {
            let config = try fetchAuthConfig()

            let containerUrl = FileManager.default.containerURL(
                forSecurityApplicationGroupIdentifier: DictationConstants.appGroupId
            )
            let audioUrl = containerUrl?.appendingPathComponent("dictation_recording.m4a")
                ?? FileManager.default.temporaryDirectory.appendingPathComponent("dictation_recording.m4a")

            guard let defaults = defaults else {
                failWithError("Cannot access shared defaults")
                return
            }

            let dictationLanguage = defaults.string(forKey: "voquill_dictation_language") ?? "en"
            let userName = defaults.string(forKey: "voquill_user_name") ?? "User"
            let termData = SharedTerm.loadFromDefaults(defaults)
            let prompt = buildLocalizedTranscriptionPrompt(
                termIds: termData.termIds,
                termById: termData.termById,
                userName: userName,
                language: dictationLanguage
            )
            let whisperLanguage = mapDictationLanguageToWhisperLanguage(dictationLanguage)

            let rawTranscript = try await CloudTranscribeAudioRepo(config: config).transcribe(
                audioFileURL: audioUrl,
                prompt: prompt,
                language: whisperLanguage
            )

            guard !rawTranscript.isEmpty else {
                failWithError("No speech detected")
                return
            }

            defaults.set(rawTranscript, forKey: DictationConstants.rawTranscriptKey)

            var finalText = rawTranscript
            let toneId = defaults.string(forKey: DictationConstants.toneIdKey)
            let toneData = SharedTone.loadFromDefaults(defaults)
            let tone = toneId.flatMap { toneData.toneById?[$0] }

            if let tone = tone {
                do {
                    let raw = try await CloudGenerateTextRepo(config: config).generate(
                        system: buildSystemPostProcessingPrompt(),
                        prompt: buildPostProcessingPrompt(
                            transcript: rawTranscript,
                            tonePromptTemplate: tone.promptTemplate
                        ),
                        jsonResponse: postProcessingJsonResponse
                    )
                    if let data = raw.data(using: .utf8),
                       let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
                       let processed = json["processedTranscription"] as? String {
                        finalText = processed.trimmingCharacters(in: .whitespacesAndNewlines)
                    }
                } catch {
                    NSLog("[VoquillApp] Post-processing failed, using raw: %@", error.localizedDescription)
                }
            }

            let tz = TimeZone.current.identifier
            UserRepo(config: config).trackStreak(timezone: tz)
            UserRepo(config: config).incrementWordCount(text: finalText, timezone: tz)

            TranscriptionRepo().save(
                text: finalText,
                rawTranscript: rawTranscript,
                toneId: toneId,
                toneName: tone?.name,
                audioSourceUrl: audioUrl
            )

            defaults.set(finalText, forKey: DictationConstants.resultKey)
            setPhase(.ready)
            DarwinNotificationManager.shared.post(DictationConstants.transcriptionReady)

            await MainActor.run {
                endLiveActivity()
            }

            try? FileManager.default.removeItem(at: audioUrl)
        } catch {
            NSLog("[VoquillApp] Transcription failed: %@", error.localizedDescription)
            failWithError(error.localizedDescription)
        }
    }

    private func fetchAuthConfig() throws -> RepoConfig {
        guard let defaults = defaults,
              let apiRefreshToken = defaults.string(forKey: "voquill_api_refresh_token"),
              let functionUrl = defaults.string(forKey: "voquill_function_url"),
              let apiKey = defaults.string(forKey: "voquill_api_key"),
              let authUrl = defaults.string(forKey: "voquill_auth_url") else {
            throw DictationError.missingAuth
        }

        let semaphore = DispatchSemaphore(value: 0)
        var resultConfig: RepoConfig?
        var resultError: Error?

        refreshApiToken(functionUrl: functionUrl, apiRefreshToken: apiRefreshToken) { customToken in
            guard let customToken = customToken else {
                resultError = DictationError.authFailed("Failed to refresh API token")
                semaphore.signal()
                return
            }
            self.exchangeCustomToken(authUrl: authUrl, apiKey: apiKey, customToken: customToken) { idToken, _ in
                if let idToken = idToken {
                    resultConfig = RepoConfig(functionUrl: functionUrl, idToken: idToken)
                } else {
                    resultError = DictationError.authFailed("Failed to exchange custom token")
                }
                semaphore.signal()
            }
        }

        semaphore.wait()
        if let config = resultConfig { return config }
        throw resultError ?? DictationError.authFailed("Unknown auth error")
    }

    private func refreshApiToken(functionUrl: String, apiRefreshToken: String, completion: @escaping (String?) -> Void) {
        guard let url = URL(string: functionUrl) else {
            completion(nil)
            return
        }

        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        let payload: [String: Any] = [
            "data": [
                "name": "auth/refreshApiToken",
                "args": ["apiRefreshToken": apiRefreshToken]
            ]
        ]
        request.httpBody = try? JSONSerialization.data(withJSONObject: payload)

        URLSession.shared.dataTask(with: request) { data, _, error in
            guard error == nil, let data = data,
                  let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
                  let result = json["result"] as? [String: Any],
                  let apiToken = result["apiToken"] as? String else {
                completion(nil)
                return
            }
            completion(apiToken)
        }.resume()
    }

    private func exchangeCustomToken(authUrl: String, apiKey: String, customToken: String, completion: @escaping (String?, TimeInterval?) -> Void) {
        let urlString = "\(authUrl)/v1/accounts:signInWithCustomToken?key=\(apiKey)"
        guard let url = URL(string: urlString) else {
            completion(nil, nil)
            return
        }

        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        let body: [String: Any] = [
            "token": customToken,
            "returnSecureToken": true
        ]
        request.httpBody = try? JSONSerialization.data(withJSONObject: body)

        URLSession.shared.dataTask(with: request) { data, _, error in
            guard error == nil, let data = data,
                  let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
                  let idToken = json["idToken"] as? String,
                  let expiresInStr = json["expiresIn"] as? String,
                  let expiresIn = TimeInterval(expiresInStr) else {
                completion(nil, nil)
                return
            }
            completion(idToken, expiresIn)
        }.resume()
    }

    // MARK: - Live Activity

    private func startLiveActivity() {
        guard #available(iOS 16.2, *) else { return }
        guard ActivityAuthorizationInfo().areActivitiesEnabled else {
            NSLog("[VoquillApp] Live Activities not enabled")
            return
        }

        let attributes = DictationAttributes()
        let state = DictationAttributes.ContentState(phase: "recording", elapsedSeconds: 0)

        do {
            activity = try Activity.request(
                attributes: attributes,
                content: .init(state: state, staleDate: nil),
                pushType: nil
            )
            NSLog("[VoquillApp] Live Activity started")
        } catch {
            NSLog("[VoquillApp] Failed to start Live Activity: %@", error.localizedDescription)
        }
    }

    private func updateLiveActivity(phase: String, elapsed: Int) {
        guard #available(iOS 16.2, *) else { return }
        let state = DictationAttributes.ContentState(phase: phase, elapsedSeconds: elapsed)
        Task {
            await activity?.update(.init(state: state, staleDate: nil))
        }
    }

    private func endLiveActivity() {
        guard #available(iOS 16.2, *) else { return }
        let state = DictationAttributes.ContentState(phase: "idle", elapsedSeconds: 0)
        Task {
            await activity?.end(.init(state: state, staleDate: nil), dismissalPolicy: .immediate)
            activity = nil
        }
    }

    // MARK: - Elapsed Timer

    private func startElapsedTimer() {
        startTime = Date()
        elapsedTimer = Timer.scheduledTimer(withTimeInterval: 1.0, repeats: true) { [weak self] _ in
            guard let self = self, let start = self.startTime else { return }
            let elapsed = Int(Date().timeIntervalSince(start))
            self.updateLiveActivity(phase: self.currentPhase.rawValue, elapsed: elapsed)
        }
    }

    private func stopElapsedTimer() {
        elapsedTimer?.invalidate()
        elapsedTimer = nil
        startTime = nil
    }

    // MARK: - Phase Management

    private func setPhase(_ phase: DictationPhase) {
        defaults?.set(phase.rawValue, forKey: DictationConstants.phaseKey)
        DarwinNotificationManager.shared.post(DictationConstants.dictationPhaseChanged)

        if phase == .processing {
            updateLiveActivity(phase: "processing", elapsed: 0)
        }
    }

    private func failWithError(_ message: String) {
        defaults?.set(message, forKey: DictationConstants.errorKey)
        setPhase(.error)
        DarwinNotificationManager.shared.post(DictationConstants.transcriptionReady)
        stopElapsedTimer()
        DispatchQueue.main.async {
            self.endLiveActivity()
        }
    }
}

enum DictationError: Error, LocalizedError {
    case missingAuth
    case authFailed(String)

    var errorDescription: String? {
        switch self {
        case .missingAuth: return "Missing authentication credentials"
        case .authFailed(let msg): return "Auth failed: \(msg)"
        }
    }
}
