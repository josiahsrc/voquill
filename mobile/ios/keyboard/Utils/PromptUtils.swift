import Foundation

let postProcessingJsonResponse: [String: Any] = [
    "name": "transcription_cleaning",
    "description": "JSON response with the processed transcription",
    "schema": [
        "type": "object",
        "properties": [
            "processedTranscription": [
                "type": "string",
                "description": "The processed version of the transcript. Empty if no transcript."
            ]
        ],
        "required": ["processedTranscription"],
        "additionalProperties": false
    ] as [String: Any]
]

func buildSystemPostProcessingPrompt() -> String {
    return "You are a transcript rewriting assistant. You modify the style and tone of the transcript while keeping the subject matter the same. Your response MUST be in JSON format with ONLY a single field 'processedTranscription' that contains the rewritten transcript."
}

func buildPostProcessingPrompt(transcript: String, tonePromptTemplate: String) -> String {
    let defaults = UserDefaults(suiteName: appGroupId)
    let userName = defaults?.string(forKey: "voquill_user_name") ?? "User"
    let dictationLanguage = defaults?.string(forKey: "voquill_dictation_language") ?? "en"

    return """
    Your task is to post-process a transcription.

    Context:
    - The speaker's name is \(userName).
    - The speaker wants the processed transcription to be in the \(dictationLanguage) language.

    Instructions:
    ```
    \(tonePromptTemplate)
    ```

    Here is the transcript that you need to process:
    ```
    \(transcript)
    ```

    Post-process transcription according to the instructions.

    **CRITICAL** Your response MUST be in JSON format.
    """
}
