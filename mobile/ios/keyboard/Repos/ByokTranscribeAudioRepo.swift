import Foundation

enum ByokTranscriptionProvider: String {
    case openai
    case groq

    var apiUrl: String {
        switch self {
        case .openai:
            return "https://api.openai.com/v1/audio/transcriptions"
        case .groq:
            return "https://api.groq.com/openai/v1/audio/transcriptions"
        }
    }

    var defaultModel: String {
        switch self {
        case .openai:
            return "whisper-1"
        case .groq:
            return "whisper-large-v3"
        }
    }
}

class ByokTranscribeAudioRepo: BaseTranscribeAudioRepo {
    private let apiKey: String
    private let provider: ByokTranscriptionProvider

    init(apiKey: String, provider: ByokTranscriptionProvider) {
        self.apiKey = apiKey
        self.provider = provider
    }

    override func transcribeSegment(audioData: Data, prompt: String?, language: String?) async throws -> String {
        guard let url = URL(string: provider.apiUrl) else {
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

        appendField("model", provider.defaultModel)
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
}
