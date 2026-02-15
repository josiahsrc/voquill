import AVFoundation
import ActivityKit
import Foundation

class DictationService {
    static let shared = DictationService()

    private var audioEngine: AVAudioEngine?
    private var audioFile: AVAudioFile?
    private var audioFormat: AVAudioFormat?
    private var isRecording = false
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

        createNewAudioFile()
        isRecording = true

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
        isRecording = false
        audioFile = nil
        defaults?.set(Float(0), forKey: DictationConstants.audioLevelKey)
        setPhase(.active)
        if let start = startTime {
            let elapsed = Int(Date().timeIntervalSince(start))
            updateLiveActivity(phase: "active", elapsed: elapsed)
        }
    }

    func resumeRecording() {
        guard currentPhase == .active else { return }
        NSLog("[VoquillApp] resumeRecording")
        createNewAudioFile()
        isRecording = true
        setPhase(.recording)
    }

    func stopDictation() {
        NSLog("[VoquillApp] stopDictation")
        DarwinNotificationManager.shared.removeObserver(DictationConstants.stopRecording)
        DarwinNotificationManager.shared.removeObserver(DictationConstants.startRecording)
        DarwinNotificationManager.shared.removeObserver(DictationConstants.stopDictation)

        isRecording = false
        stopElapsedTimer()
        stopAudioEngine()
        setPhase(.idle)

        endLiveActivity()
        endAllLiveActivities()
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
        self.audioFormat = format

        inputNode.installTap(onBus: 0, bufferSize: 4096, format: format) { [weak self] buffer, _ in
            guard let self = self else { return }
            if self.isRecording {
                try? self.audioFile?.write(from: buffer)
                self.updateAudioLevel(buffer: buffer)
            }
        }

        engine.prepare()
        try engine.start()
        self.audioEngine = engine
    }

    private func createNewAudioFile() {
        guard let format = audioFormat,
              let audioUrl = DictationConstants.audioFileURL else { return }
        try? FileManager.default.removeItem(at: audioUrl)

        let settings: [String: Any] = [
            AVFormatIDKey: Int(kAudioFormatMPEG4AAC),
            AVSampleRateKey: format.sampleRate,
            AVNumberOfChannelsKey: 1,
            AVEncoderAudioQualityKey: AVAudioQuality.medium.rawValue
        ]
        audioFile = try? AVAudioFile(forWriting: audioUrl, settings: settings)
    }

    private func updateAudioLevel(buffer: AVAudioPCMBuffer) {
        guard let data = buffer.floatChannelData?[0] else { return }
        let count = Int(buffer.frameLength)
        guard count > 0 else { return }

        var sum: Float = 0
        for i in 0..<count {
            sum += data[i] * data[i]
        }
        let rms = sqrt(sum / Float(count))
        let db = 20 * log10(max(rms, 1e-6))
        let normalized = max(0, min(1, (db + 50) / 50))

        defaults?.set(normalized, forKey: DictationConstants.audioLevelKey)
    }

    private func stopAudioEngine() {
        audioEngine?.inputNode.removeTap(onBus: 0)
        audioEngine?.stop()
        audioEngine = nil
        audioFile = nil
        audioFormat = nil
        defaults?.set(Float(0), forKey: DictationConstants.audioLevelKey)
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

    private func endAllLiveActivities() {
        guard #available(iOS 16.2, *) else { return }
        let state = DictationAttributes.ContentState(phase: "idle", elapsedSeconds: 0)
        Task {
            for activity in Activity<DictationAttributes>.activities {
                await activity.end(.init(state: state, staleDate: nil), dismissalPolicy: .immediate)
            }
        }
    }

    func cleanupOnLaunch() {
        setPhase(.idle)
        endAllLiveActivities()
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
