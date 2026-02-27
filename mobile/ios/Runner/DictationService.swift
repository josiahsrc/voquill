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

    @available(iOS 16.2, *)
    private var activity: Activity<DictationAttributes>? {
        get { activityRef as? Activity<DictationAttributes> }
        set { activityRef = newValue }
    }

    private let defaults = UserDefaults(suiteName: DictationConstants.appGroupId)
    private var heartbeatTimer: Timer?

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
        startHeartbeat()
        startInterruptionObserver()
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
        updateLiveActivity(phase: "active")
    }

    func resumeRecording() {
        guard currentPhase == .active else { return }
        NSLog("[VoquillApp] resumeRecording")

        if audioEngine?.isRunning != true {
            NSLog("[VoquillApp] Audio engine not running, attempting restart")
            do {
                try configureAudioSession()
                if audioEngine == nil {
                    try startAudioEngine()
                } else {
                    try audioEngine?.start()
                }
            } catch {
                NSLog("[VoquillApp] Failed to restart audio engine: %@", error.localizedDescription)
                stopDictation()
                return
            }
        }

        createNewAudioFile()
        isRecording = true
        setPhase(.recording)
        updateLiveActivity(phase: "recording")
    }

    func stopDictation() {
        NSLog("[VoquillApp] stopDictation")
        DarwinNotificationManager.shared.removeObserver(DictationConstants.stopRecording)
        DarwinNotificationManager.shared.removeObserver(DictationConstants.startRecording)
        DarwinNotificationManager.shared.removeObserver(DictationConstants.stopDictation)

        isRecording = false
        stopAudioEngine()
        stopHeartbeat()
        stopInterruptionObserver()
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

    // MARK: - Heartbeat

    private func startHeartbeat() {
        stopHeartbeat()
        writeHeartbeat()
        heartbeatTimer = Timer.scheduledTimer(withTimeInterval: 2.0, repeats: true) { [weak self] _ in
            self?.writeHeartbeat()
        }
    }

    private func stopHeartbeat() {
        heartbeatTimer?.invalidate()
        heartbeatTimer = nil
        defaults?.removeObject(forKey: DictationConstants.heartbeatKey)
    }

    private func writeHeartbeat() {
        defaults?.set(Date().timeIntervalSince1970, forKey: DictationConstants.heartbeatKey)
    }

    // MARK: - Audio Session Interruption

    private func startInterruptionObserver() {
        NotificationCenter.default.addObserver(
            self,
            selector: #selector(handleAudioInterruption(_:)),
            name: AVAudioSession.interruptionNotification,
            object: AVAudioSession.sharedInstance()
        )
    }

    private func stopInterruptionObserver() {
        NotificationCenter.default.removeObserver(
            self,
            name: AVAudioSession.interruptionNotification,
            object: AVAudioSession.sharedInstance()
        )
    }

    @objc private func handleAudioInterruption(_ notification: Notification) {
        guard let userInfo = notification.userInfo,
              let typeValue = userInfo[AVAudioSessionInterruptionTypeKey] as? UInt,
              let type = AVAudioSession.InterruptionType(rawValue: typeValue) else {
            return
        }

        switch type {
        case .began:
            NSLog("[VoquillApp] Audio session interrupted (e.g. phone call)")
            isRecording = false
            audioFile = nil
            defaults?.set(Float(0), forKey: DictationConstants.audioLevelKey)

        case .ended:
            let optionsValue = userInfo[AVAudioSessionInterruptionOptionKey] as? UInt ?? 0
            let options = AVAudioSession.InterruptionOptions(rawValue: optionsValue)

            if options.contains(.shouldResume) {
                NSLog("[VoquillApp] Audio interruption ended, resuming")
                do {
                    try AVAudioSession.sharedInstance().setActive(true)
                    if audioEngine?.isRunning != true {
                        try audioEngine?.start()
                    }
                    if currentPhase == .recording || currentPhase == .active {
                        createNewAudioFile()
                        isRecording = true
                        setPhase(.recording)
                        updateLiveActivity(phase: "recording")
                    }
                } catch {
                    NSLog("[VoquillApp] Failed to resume after interruption: %@", error.localizedDescription)
                    stopDictation()
                }
            } else {
                NSLog("[VoquillApp] Audio interruption ended, not resumable — stopping")
                stopDictation()
            }

        @unknown default:
            break
        }
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

    private func updateLiveActivity(phase: String) {
        guard #available(iOS 16.2, *) else { return }
        let state = DictationAttributes.ContentState(phase: phase, elapsedSeconds: 0)
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
        stopHeartbeat()
        endAllLiveActivities()
    }

    // MARK: - Phase Management

    private func setPhase(_ phase: DictationPhase) {
        defaults?.set(phase.rawValue, forKey: DictationConstants.phaseKey)
        DarwinNotificationManager.shared.post(DictationConstants.dictationPhaseChanged)
    }
}
