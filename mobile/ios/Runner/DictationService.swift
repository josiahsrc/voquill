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

    var isRunning: Bool {
        return audioEngine?.isRunning == true
    }

    var currentPhase: DictationPhase {
        let raw = defaults?.string(forKey: DictationConstants.phaseKey) ?? "idle"
        return DictationPhase(rawValue: raw) ?? .idle
    }

    func startDictation() {
        guard currentPhase == .idle else {
            NSLog("[VoquillApp] startDictation ignored, phase is %@", currentPhase.rawValue)
            return
        }
        NSLog("[VoquillApp] startDictation")

        let now = Date().timeIntervalSince1970
        defaults?.set(now, forKey: DictationConstants.startedAtKey)

        do {
            try configureAudioSession()
            try startAudioEngine()
        } catch {
            NSLog("[VoquillApp] Audio setup failed: %@", error.localizedDescription)
            stopDictation()
            return
        }

        startLiveActivity()
        startElapsedTimer()
        setPhase(.recording)

        DarwinNotificationManager.shared.observe(DictationConstants.stopRecording) { [weak self] in
            self?.pauseRecording()
        }
        DarwinNotificationManager.shared.observe(DictationConstants.startRecording) { [weak self] in
            self?.resumeRecording()
        }
        DarwinNotificationManager.shared.observe(DictationConstants.stopDictation) { [weak self] in
            self?.stopDictation()
        }
    }

    func pauseRecording() {
        guard currentPhase == .recording else { return }
        NSLog("[VoquillApp] pauseRecording")
        setPhase(.active)
        if let start = startTime {
            let elapsed = Int(Date().timeIntervalSince(start))
            updateLiveActivity(phase: "active", elapsed: elapsed)
        }
    }

    func resumeRecording() {
        guard currentPhase == .active else { return }
        NSLog("[VoquillApp] resumeRecording")
        setPhase(.recording)
    }

    func stopDictation() {
        NSLog("[VoquillApp] stopDictation")
        DarwinNotificationManager.shared.removeObserver(DictationConstants.stopRecording)
        DarwinNotificationManager.shared.removeObserver(DictationConstants.startRecording)
        DarwinNotificationManager.shared.removeObserver(DictationConstants.stopDictation)

        stopElapsedTimer()
        stopAudioEngine()
        setPhase(.idle)

        DispatchQueue.main.async {
            self.endLiveActivity()
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
            let phase = self.currentPhase.rawValue
            self.updateLiveActivity(phase: phase, elapsed: elapsed)
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
    }
}
