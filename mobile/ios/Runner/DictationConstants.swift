import Foundation

enum DictationPhase: String {
    case idle
    case active
    case recording
}

struct DictationConstants {
    static let startRecording = "com.voquill.startRecording"
    static let stopRecording = "com.voquill.stopRecording"
    static let stopDictation = "com.voquill.stopDictation"
    static let dictationPhaseChanged = "com.voquill.dictationPhaseChanged"

    static let phaseKey = "voquill_dictation_phase"
    static let startedAtKey = "voquill_dictation_started_at"
    static let audioLevelKey = "voquill_audio_level"
    static let heartbeatKey = "voquill_dictation_heartbeat"
    static let heartbeatStaleThreshold: TimeInterval = 5.0
    static let maxRecordingDuration: TimeInterval = 240.0
    static let idleTimeoutKey = "voquill_idle_timeout_seconds"
    static let defaultIdleTimeout: TimeInterval = 120.0

    static let appGroupId = "group.com.voquill.mobile"

    static var audioFileURL: URL? {
        FileManager.default.containerURL(forSecurityApplicationGroupIdentifier: appGroupId)?
            .appendingPathComponent("dictation_recording.m4a")
    }
}
