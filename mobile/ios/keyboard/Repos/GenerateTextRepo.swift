import Foundation

class BaseGenerateTextRepo {
    func generateText(system: String?, prompt: String, jsonResponse: [String: Any]? = nil) async throws -> String {
        fatalError("Subclasses must override generateText")
    }

    func generate(system: String?, prompt: String, jsonResponse: [String: Any]? = nil) async throws -> String {
        try await withRetry {
            try await self.generateText(system: system, prompt: prompt, jsonResponse: jsonResponse)
        }
    }
}

// MARK: - Cloud Implementation

class CloudGenerateTextRepo: BaseGenerateTextRepo {
    private let config: RepoConfig

    init(config: RepoConfig) {
        self.config = config
    }

    override func generateText(system: String?, prompt: String, jsonResponse: [String: Any]? = nil) async throws -> String {
        var args: [String: Any] = ["prompt": prompt]
        if let system = system {
            args["system"] = system
        }
        if let jsonResponse = jsonResponse {
            args["jsonResponse"] = jsonResponse
        }
        let result = try await invokeHandler(config: config, name: "ai/generateText", args: args)
        guard let text = result["text"] as? String else {
            throw ApiError.parseError
        }
        return text
    }
}
