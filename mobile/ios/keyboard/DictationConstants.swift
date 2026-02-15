import Foundation

enum DictationPhase: String {
    case idle
    case recording
    case processing
    case ready
    case error
}

struct DictationConstants {
    static let stopDictation = "com.voquill.stopDictation"
    static let transcriptionReady = "com.voquill.transcriptionReady"
    static let dictationPhaseChanged = "com.voquill.dictationPhaseChanged"

    static let phaseKey = "voquill_dictation_phase"
    static let resultKey = "voquill_dictation_result"
    static let errorKey = "voquill_dictation_error"
    static let toneIdKey = "voquill_dictation_tone_id"
    static let rawTranscriptKey = "voquill_dictation_raw_transcript"
    static let startedAtKey = "voquill_dictation_started_at"

    static let appGroupId = "group.com.voquill.mobile"
}
