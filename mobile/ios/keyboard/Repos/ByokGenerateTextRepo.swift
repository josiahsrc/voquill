import Foundation

enum ByokGenerationProvider: String {
    case openai
    case groq

    var apiUrl: String {
        switch self {
        case .openai:
            return "https://api.openai.com/v1/chat/completions"
        case .groq:
            return "https://api.groq.com/openai/v1/chat/completions"
        }
    }

    var defaultModel: String {
        switch self {
        case .openai:
            return "gpt-4o-mini"
        case .groq:
            return "llama-3.3-70b-versatile"
        }
    }
}

class ByokGenerateTextRepo: BaseGenerateTextRepo {
    private let apiKey: String
    private let provider: ByokGenerationProvider

    init(apiKey: String, provider: ByokGenerationProvider) {
        self.apiKey = apiKey
        self.provider = provider
    }

    override func generateText(system: String?, prompt: String, jsonResponse: [String: Any]? = nil) async throws -> String {
        guard let url = URL(string: provider.apiUrl) else {
            throw ApiError.invalidURL
        }

        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("Bearer \(apiKey)", forHTTPHeaderField: "Authorization")
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")

        var messages: [[String: Any]] = []
        if let system = system {
            messages.append(["role": "system", "content": system])
        }
        messages.append(["role": "user", "content": prompt])

        var payload: [String: Any] = [
            "model": provider.defaultModel,
            "messages": messages,
        ]

        if jsonResponse != nil {
            payload["response_format"] = ["type": "json_object"]
        }

        request.httpBody = try JSONSerialization.data(withJSONObject: payload)

        let (data, response) = try await URLSession.shared.data(for: request)

        guard let httpResponse = response as? HTTPURLResponse,
              (200...299).contains(httpResponse.statusCode) else {
            let statusCode = (response as? HTTPURLResponse)?.statusCode ?? -1
            let responseBody = String(data: data, encoding: .utf8) ?? ""
            throw ApiError.httpError(statusCode, responseBody)
        }

        guard let json = try JSONSerialization.jsonObject(with: data) as? [String: Any],
              let choices = json["choices"] as? [[String: Any]],
              let first = choices.first,
              let message = first["message"] as? [String: Any],
              let content = message["content"] as? String else {
            throw ApiError.parseError
        }

        return content
    }
}
