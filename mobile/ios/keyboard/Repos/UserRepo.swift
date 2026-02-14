import Foundation

class UserRepo {
    private let config: RepoConfig

    init(config: RepoConfig) {
        self.config = config
    }

    func trackStreak() {
        invokeHandlerFireAndForget(config: config, name: "user/trackStreak", args: [:])
    }

    func incrementWordCount(text: String) {
        let wordCount = text.split(whereSeparator: { $0.isWhitespace || $0.isNewline }).count
        guard wordCount > 0 else { return }
        invokeHandlerFireAndForget(config: config, name: "user/incrementWordCount", args: ["wordCount": wordCount])
    }
}
