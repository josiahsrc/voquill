import Foundation

class ByokTranscribeAudioRepo: BaseTranscribeAudioRepo {
    private let apiKey: String
    private let apiUrl: String
    private let model: String

    init(apiKey: String, provider: String, baseUrl: String?) {
        self.apiKey = apiKey
        switch provider {
        case "groq":
            self.apiUrl = "https://api.groq.com/openai/v1/audio/transcriptions"
            self.model = "whisper-large-v3"
        case "speaches":
            let base = (baseUrl ?? "").trimmingCharacters(in: CharacterSet(charactersIn: "/"))
            self.apiUrl = "\(base)/v1/audio/transcriptions"
            self.model = "whisper-large-v3"
        case "openaiCompatible":
            let base = (baseUrl ?? "").trimmingCharacters(in: CharacterSet(charactersIn: "/"))
            self.apiUrl = "\(base)/audio/transcriptions"
            self.model = "whisper-1"
        default:
            self.apiUrl = "https://api.openai.com/v1/audio/transcriptions"
            self.model = "whisper-1"
        }
    }

    override func transcribeSegment(audioData: Data, prompt: String?, language: String?) async throws -> String {
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
}
