import Foundation

class UserRepo {
    private let config: RepoConfig

    init(config: RepoConfig) {
        self.config = config
    }

    func trackStreak(timezone: String? = nil) {
        var args: [String: Any] = [:]
        if let timezone = timezone {
            args["timezone"] = timezone
        }
        invokeHandlerFireAndForget(config: config, name: "user/trackStreak", args: args)
    }

    func incrementWordCount(text: String, timezone: String? = nil) {
        let wordCount = text.split(whereSeparator: { $0.isWhitespace || $0.isNewline }).count
        guard wordCount > 0 else { return }
        var args: [String: Any] = ["wordCount": wordCount]
        if let timezone = timezone {
            args["timezone"] = timezone
        }
        invokeHandlerFireAndForget(config: config, name: "user/incrementWordCount", args: args)
    }
}
