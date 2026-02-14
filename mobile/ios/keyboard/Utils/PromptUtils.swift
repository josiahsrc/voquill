import Foundation

func buildSystemPostProcessingPrompt() -> String {
    return "You are a transcript rewriting assistant. You modify the style and tone of the transcript while keeping the subject matter the same. Your response MUST be in JSON format with ONLY a single field 'processedTranscription' that contains the rewritten transcript."
}

func buildPostProcessingPrompt(transcript: String, tonePromptTemplate: String) -> String {
    let userName = "temporary"
    let languageName = "English"

    return """
    Your task is to post-process a transcription.

    Context:
    - The speaker's name is \(userName).
    - The speaker wants the processed transcription to be in the \(languageName) language.

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
