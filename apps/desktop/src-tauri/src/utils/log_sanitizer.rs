use once_cell::sync::Lazy;
use regex::Regex;

struct SanitizeRule {
    pattern: Regex,
    replacement: &'static str,
}

static RULES: Lazy<Vec<SanitizeRule>> = Lazy::new(|| {
    vec![
        // [Provider] Received transcript: {"length":142,"preview":"some text..."}
        // Redact the preview value but keep the rest
        SanitizeRule {
            pattern: Regex::new(
                r#"(?m)(Received transcript:\s*.*?"preview"\s*:\s*)"(?:[^"\\]|\\.)*""#,
            )
            .unwrap(),
            replacement: r#"${1}"[REDACTED]""#,
        },
        // Processed transcript: <full text until end of line>
        SanitizeRule {
            pattern: Regex::new(r"(?m)(Processed transcript:)\s*.+$").unwrap(),
            replacement: "$1 [REDACTED]",
        },
        // LLM raw output: <full text until end of line>
        SanitizeRule {
            pattern: Regex::new(r"(?m)(LLM raw output:)\s*.+$").unwrap(),
            replacement: "$1 [REDACTED]",
        },
        // [Azure Streaming] Timeout reached, finalizing with transcript: <text>
        SanitizeRule {
            pattern: Regex::new(r"(?m)(finalizing with transcript:)\s*.+$").unwrap(),
            replacement: "$1 [REDACTED]",
        },
        // [Azure Streaming] Recognition stopped, final transcript: <text>
        SanitizeRule {
            pattern: Regex::new(r"(?m)(final transcript:)\s*.+$").unwrap(),
            replacement: "$1 [REDACTED]",
        },
    ]
});

pub fn sanitize_log_content(input: &str) -> String {
    let mut result = input.to_string();
    for rule in RULES.iter() {
        result = rule
            .pattern
            .replace_all(&result, rule.replacement)
            .into_owned();
    }
    result
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_redacts_assemblyai_transcript_preview() {
        let input = r#"[2024-01-15][14:30:45.123][DEBUG][webview] [AssemblyAI] Received transcript: {"length":142,"preview":"Hello this is a private dictation about my medical..."}"#;
        let result = sanitize_log_content(input);
        assert!(result.contains(r#""[REDACTED]""#));
        assert!(!result.contains("Hello this is a private"));
        assert!(result.contains("length"));
    }

    #[test]
    fn test_redacts_deepgram_transcript_preview() {
        let input = r#"[2024-01-15][14:30:45.123][DEBUG][webview] [Deepgram] Received transcript: {"length":85,"preview":"Meeting notes for the quarterly review with clien..."}"#;
        let result = sanitize_log_content(input);
        assert!(result.contains(r#""[REDACTED]""#));
        assert!(!result.contains("Meeting notes"));
    }

    #[test]
    fn test_redacts_elevenlabs_transcript_preview() {
        let input = r#"[2024-01-15][14:30:45.123][DEBUG][webview] [ElevenLabs] Received transcript: {"length":200,"preview":"Dear doctor, I am writing to inform you about my ..."}"#;
        let result = sanitize_log_content(input);
        assert!(result.contains(r#""[REDACTED]""#));
        assert!(!result.contains("Dear doctor"));
    }

    #[test]
    fn test_redacts_azure_transcript_preview() {
        let input = r#"[2024-01-15][14:30:45.123][DEBUG][webview] [Azure] Received transcript: {"length":50,"preview":"Some sensitive text here"}"#;
        let result = sanitize_log_content(input);
        assert!(result.contains(r#""[REDACTED]""#));
        assert!(!result.contains("Some sensitive text here"));
    }

    #[test]
    fn test_redacts_new_server_transcript_preview() {
        let input = r#"[2024-01-15][14:30:45.123][DEBUG][webview] [NewServer] Received transcript: {"rawLength":100,"processedLength":95,"preview":"Private conversation content that should not appea..."}"#;
        let result = sanitize_log_content(input);
        assert!(result.contains(r#""[REDACTED]""#));
        assert!(!result.contains("Private conversation"));
    }

    #[test]
    fn test_redacts_processed_transcript() {
        let input = "[2024-01-15][14:30:45.123][DEBUG][webview] Processed transcript: This is the full processed transcript that the user dictated and it contains sensitive information.";
        let result = sanitize_log_content(input);
        assert!(result.contains("Processed transcript: [REDACTED]"));
        assert!(!result.contains("sensitive information"));
    }

    #[test]
    fn test_redacts_azure_streaming_timeout_transcript() {
        let input = "[2024-01-15][14:30:45.123][DEBUG][webview] [Azure Streaming] Timeout reached, finalizing with transcript: Hello this is my private medical information";
        let result = sanitize_log_content(input);
        assert!(result.contains("finalizing with transcript: [REDACTED]"));
        assert!(!result.contains("private medical"));
    }

    #[test]
    fn test_redacts_azure_streaming_final_transcript() {
        let input = "[2024-01-15][14:30:45.123][DEBUG][webview] [Azure Streaming] Recognition stopped, final transcript: This is highly confidential dictation content";
        let result = sanitize_log_content(input);
        assert!(result.contains("final transcript: [REDACTED]"));
        assert!(!result.contains("highly confidential"));
    }

    #[test]
    fn test_preserves_non_sensitive_log_lines() {
        let input = "[2024-01-15][14:30:45.123][INFO][webview] Transcript pasted successfully";
        let result = sanitize_log_content(input);
        assert_eq!(result, input);
    }

    #[test]
    fn test_preserves_timing_logs() {
        let input = r#"[2024-01-15][14:30:45.123][DEBUG][webview] [AssemblyAI] Transcript timing: {"durationMs":1234}"#;
        let result = sanitize_log_content(input);
        assert_eq!(result, input);
    }

    #[test]
    fn test_handles_multiline_log_content() {
        let input = r#"[2024-01-15][14:30:45.123][DEBUG][webview] [Deepgram] Received transcript: {"length":85,"preview":"Secret meeting notes..."}
[2024-01-15][14:30:46.000][INFO][webview] Transcript pasted successfully
[2024-01-15][14:30:47.000][DEBUG][webview] Processed transcript: Another secret transcript here"#;
        let result = sanitize_log_content(input);
        assert!(!result.contains("Secret meeting"));
        assert!(!result.contains("Another secret"));
        assert!(result.contains("Transcript pasted successfully"));
    }

    #[test]
    fn test_redacts_llm_raw_output() {
        let input = r#"[2026-03-07][10:25:32.892][DEBUG][webview:debug@http://localhost:1420/node_modules/.vite/deps/@tauri-apps_plugin-log.js:71:12] LLM raw output: {"processedTranscription":"Testing, one, two, three."}"#;
        let result = sanitize_log_content(input);
        assert!(result.contains("LLM raw output: [REDACTED]"));
        assert!(!result.contains("Testing, one, two, three"));
    }

    #[test]
    fn test_empty_input() {
        assert_eq!(sanitize_log_content(""), "");
    }

    #[test]
    fn test_preserves_transcript_metadata_without_content() {
        let input = "[2024-01-15][14:30:45.123][INFO][webview] Storing transcription record";
        let result = sanitize_log_content(input);
        assert_eq!(result, input);
    }
}
