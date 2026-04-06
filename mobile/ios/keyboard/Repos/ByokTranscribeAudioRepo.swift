import Foundation

class ByokTranscribeAudioRepo: BaseTranscribeAudioRepo {
    private let apiKey: String
    private let provider: String
    private let apiUrl: String
    private let model: String
    private let azureRegion: String?

    init(apiKey: String, provider: String, baseUrl: String?, modelOverride: String? = nil, azureRegion: String? = nil) {
        self.apiKey = apiKey
        self.provider = provider
        self.azureRegion = azureRegion
        switch provider {
        case "groq":
            self.apiUrl = "https://api.groq.com/openai/v1/audio/transcriptions"
            self.model = modelOverride ?? "whisper-large-v3"
        case "speaches":
            let base = (baseUrl ?? "").trimmingCharacters(in: CharacterSet(charactersIn: "/"))
            self.apiUrl = "\(base)/v1/audio/transcriptions"
            self.model = modelOverride ?? "whisper-large-v3"
        case "openaiCompatible":
            let base = (baseUrl ?? "").trimmingCharacters(in: CharacterSet(charactersIn: "/"))
            self.apiUrl = "\(base)/audio/transcriptions"
            self.model = modelOverride ?? "whisper-1"
        case "ollama":
            let base = (baseUrl ?? "http://localhost:11434").trimmingCharacters(in: CharacterSet(charactersIn: "/"))
            self.apiUrl = "\(base)/v1/audio/transcriptions"
            self.model = modelOverride ?? "whisper-1"
        case "gemini":
            self.apiUrl = "" // handled in transcribeGemini
            self.model = modelOverride ?? "gemini-2.0-flash"
        case "azure":
            self.apiUrl = "" // handled in transcribeAzure
            self.model = modelOverride ?? ""
        default:
            self.apiUrl = "https://api.openai.com/v1/audio/transcriptions"
            self.model = modelOverride ?? "whisper-1"
        }
    }

    override func transcribeSegment(audioData: Data, prompt: String?, language: String?) async throws -> String {
        switch provider {
        case "gemini":
            return try await transcribeGemini(audioData: audioData, prompt: prompt, language: language)
        case "azure":
            return try await transcribeAzure(audioData: audioData, language: language)
        default:
            return try await transcribeWhisperCompatible(audioData: audioData, prompt: prompt, language: language)
        }
    }

    // MARK: - Whisper-compatible (OpenAI, Groq, Speaches, Ollama, OpenAI-Compatible)

    private func transcribeWhisperCompatible(audioData: Data, prompt: String?, language: String?) async throws -> String {
        guard let url = URL(string: apiUrl) else {
            throw ApiError.invalidURL
        }

        let boundary = UUID().uuidString
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("Bearer \(apiKey)", forHTTPHeaderField: "Authorization")
        request.setValue("multipart/form-data; boundary=\(boundary)", forHTTPHeaderField: "Content-Type")

        var body = Data()
        let lineBreak = "\r\n"

        func appendField(_ name: String, _ value: String) {
            body.append("--\(boundary)\(lineBreak)".data(using: .utf8)!)
            body.append("Content-Disposition: form-data; name=\"\(name)\"\(lineBreak)\(lineBreak)".data(using: .utf8)!)
            body.append("\(value)\(lineBreak)".data(using: .utf8)!)
        }

        body.append("--\(boundary)\(lineBreak)".data(using: .utf8)!)
        body.append("Content-Disposition: form-data; name=\"file\"; filename=\"audio.m4a\"\(lineBreak)".data(using: .utf8)!)
        body.append("Content-Type: audio/mp4\(lineBreak)\(lineBreak)".data(using: .utf8)!)
        body.append(audioData)
        body.append(lineBreak.data(using: .utf8)!)

        appendField("model", model)
        appendField("response_format", "text")

        if let prompt = prompt {
            appendField("prompt", prompt)
        }
        if let language = language {
            appendField("language", language)
        }

        body.append("--\(boundary)--\(lineBreak)".data(using: .utf8)!)
        request.httpBody = body

        let (data, response) = try await URLSession.shared.data(for: request)

        guard let httpResponse = response as? HTTPURLResponse,
              (200...299).contains(httpResponse.statusCode) else {
            let statusCode = (response as? HTTPURLResponse)?.statusCode ?? -1
            let responseBody = String(data: data, encoding: .utf8) ?? ""
            throw ApiError.httpError(statusCode, responseBody)
        }

        guard let text = String(data: data, encoding: .utf8)?.trimmingCharacters(in: .whitespacesAndNewlines),
              !text.isEmpty else {
            throw ApiError.parseError
        }

        return text
    }

    // MARK: - Gemini

    private func transcribeGemini(audioData: Data, prompt: String?, language: String?) async throws -> String {
        let audioBase64 = audioData.base64EncodedString()
        let transcribePrompt: String
        if let prompt = prompt, !prompt.isEmpty {
            transcribePrompt = "Transcribe this audio exactly. Use these terms if you hear them: \(prompt). Output only the transcription text."
        } else {
            transcribePrompt = "Transcribe this audio exactly. Output only the transcription text."
        }

        let urlString = "https://generativelanguage.googleapis.com/v1beta/models/\(model):generateContent?key=\(apiKey)"
        guard let url = URL(string: urlString) else {
            throw ApiError.invalidURL
        }

        let payload: [String: Any] = [
            "contents": [[
                "parts": [
                    ["inline_data": ["mime_type": "audio/mp4", "data": audioBase64]],
                    ["text": transcribePrompt],
                ]
            ]]
        ]

        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.httpBody = try JSONSerialization.data(withJSONObject: payload)

        let (data, response) = try await URLSession.shared.data(for: request)

        guard let httpResponse = response as? HTTPURLResponse,
              (200...299).contains(httpResponse.statusCode) else {
            let statusCode = (response as? HTTPURLResponse)?.statusCode ?? -1
            let responseBody = String(data: data, encoding: .utf8) ?? ""
            throw ApiError.httpError(statusCode, responseBody)
        }

        guard let json = try JSONSerialization.jsonObject(with: data) as? [String: Any],
              let candidates = json["candidates"] as? [[String: Any]],
              let first = candidates.first,
              let content = first["content"] as? [String: Any],
              let parts = content["parts"] as? [[String: Any]],
              let text = parts.first?["text"] as? String else {
            throw ApiError.parseError
        }

        return text.trimmingCharacters(in: .whitespacesAndNewlines)
    }

    // MARK: - Azure Speech STT

    private func transcribeAzure(audioData: Data, language: String?) async throws -> String {
        let region = azureRegion ?? "eastus"
        let lang = (language != nil && !language!.isEmpty) ? language! : "en-US"
        let urlString = "https://\(region).stt.speech.microsoft.com/speech/recognition/conversation/cognitiveservices/v1?language=\(lang)&format=detailed"

        guard let url = URL(string: urlString) else {
            throw ApiError.invalidURL
        }

        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue(apiKey, forHTTPHeaderField: "Ocp-Apim-Subscription-Key")
        request.setValue("audio/mp4", forHTTPHeaderField: "Content-Type")
        request.setValue("application/json", forHTTPHeaderField: "Accept")
        request.httpBody = audioData

        let (data, response) = try await URLSession.shared.data(for: request)

        guard let httpResponse = response as? HTTPURLResponse,
              (200...299).contains(httpResponse.statusCode) else {
            let statusCode = (response as? HTTPURLResponse)?.statusCode ?? -1
            let responseBody = String(data: data, encoding: .utf8) ?? ""
            throw ApiError.httpError(statusCode, responseBody)
        }

        guard let json = try JSONSerialization.jsonObject(with: data) as? [String: Any],
              let text = json["DisplayText"] as? String else {
            throw ApiError.parseError
        }

        return text.trimmingCharacters(in: .whitespacesAndNewlines)
    }
}
