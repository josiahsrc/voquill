import Foundation

class BaseGenerateTextRepo {
    func generateText(system: String?, prompt: String) async throws -> String {
        fatalError("Subclasses must override generateText")
    }

    func generate(system: String?, prompt: String) async throws -> String {
        try await withRetry {
            try await self.generateText(system: system, prompt: prompt)
        }
    }
}

// MARK: - Cloud Implementation

class CloudGenerateTextRepo: BaseGenerateTextRepo {
    private let functionUrl: String
    private let idToken: String

    init(functionUrl: String, idToken: String) {
        self.functionUrl = functionUrl
        self.idToken = idToken
    }

    override func generateText(system: String?, prompt: String) async throws -> String {
        guard let url = URL(string: functionUrl) else {
            throw GenerateTextError.invalidURL
        }

        var args: [String: Any] = ["prompt": prompt]
        if let system = system {
            args["system"] = system
        }

        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("Bearer \(idToken)", forHTTPHeaderField: "Authorization")
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")

        let payload: [String: Any] = [
            "data": [
                "name": "ai/generateText",
                "args": args,
            ],
        ]
        request.httpBody = try JSONSerialization.data(withJSONObject: payload)

        let (data, response) = try await URLSession.shared.data(for: request)

        guard let httpResponse = response as? HTTPURLResponse,
              (200...299).contains(httpResponse.statusCode) else {
            let statusCode = (response as? HTTPURLResponse)?.statusCode ?? -1
            let body = String(data: data, encoding: .utf8) ?? ""
            throw GenerateTextError.httpError(statusCode, body)
        }

        guard let json = try JSONSerialization.jsonObject(with: data) as? [String: Any],
              let result = json["result"] as? [String: Any],
              let text = result["text"] as? String else {
            throw GenerateTextError.parseError
        }

        return text
    }
}

// MARK: - Errors

enum GenerateTextError: Error, LocalizedError {
    case invalidURL
    case httpError(Int, String)
    case parseError

    var errorDescription: String? {
        switch self {
        case .invalidURL: return "Invalid function URL"
        case .httpError(let code, let body): return "HTTP \(code): \(String(body.prefix(200)))"
        case .parseError: return "Could not parse response"
        }
    }
}
