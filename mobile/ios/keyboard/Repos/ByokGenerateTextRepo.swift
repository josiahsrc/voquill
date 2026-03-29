import Foundation

class ByokGenerateTextRepo: BaseGenerateTextRepo {
    private let apiKey: String
    private let apiUrl: String
    private let model: String

    init(apiKey: String, provider: String, baseUrl: String?) {
        self.apiKey = apiKey
        switch provider {
        case "groq":
            self.apiUrl = "https://api.groq.com/openai/v1/chat/completions"
            self.model = "llama-3.3-70b-versatile"
        case "deepseek":
            self.apiUrl = "https://api.deepseek.com/chat/completions"
            self.model = "deepseek-chat"
        case "openRouter":
            self.apiUrl = "https://openrouter.ai/api/v1/chat/completions"
            self.model = "openai/gpt-4o-mini"
        case "openaiCompatible":
            let base = (baseUrl ?? "").trimmingCharacters(in: CharacterSet(charactersIn: "/"))
            self.apiUrl = "\(base)/chat/completions"
            self.model = "gpt-4o-mini"
        default:
            self.apiUrl = "https://api.openai.com/v1/chat/completions"
            self.model = "gpt-4o-mini"
        }
    }

    override func generateText(system: String?, prompt: String, jsonResponse: [String: Any]? = nil) async throws -> String {
        guard let url = URL(string: apiUrl) else {
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
            "model": model,
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
