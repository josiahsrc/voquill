import Foundation

enum ApiError: Error, LocalizedError {
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

func invokeHandler(
    config: RepoConfig,
    name: String,
    args: [String: Any]
) async throws -> [String: Any] {
    guard let url = URL(string: config.functionUrl) else {
        throw ApiError.invalidURL
    }

    var request = URLRequest(url: url)
    request.httpMethod = "POST"
    request.setValue("Bearer \(config.idToken)", forHTTPHeaderField: "Authorization")
    request.setValue("application/json", forHTTPHeaderField: "Content-Type")
    let payload: [String: Any] = ["data": ["name": name, "args": args]]
    request.httpBody = try JSONSerialization.data(withJSONObject: payload)

    let (data, response) = try await URLSession.shared.data(for: request)

    guard let httpResponse = response as? HTTPURLResponse,
          (200...299).contains(httpResponse.statusCode) else {
        let statusCode = (response as? HTTPURLResponse)?.statusCode ?? -1
        let body = String(data: data, encoding: .utf8) ?? ""
        throw ApiError.httpError(statusCode, body)
    }

    guard let json = try JSONSerialization.jsonObject(with: data) as? [String: Any],
          let result = json["result"] as? [String: Any] else {
        throw ApiError.parseError
    }

    return result
}

func invokeHandlerFireAndForget(
    config: RepoConfig,
    name: String,
    args: [String: Any]
) {
    Task {
        do {
            _ = try await invokeHandler(config: config, name: name, args: args)
        } catch {
            NSLog("[VoquillKB] %@ failed: %@", name, error.localizedDescription)
        }
    }
}
