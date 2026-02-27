import Foundation

struct MemberInfo {
    let plan: String
    let isOnTrial: Bool
    let trialEndsAt: String?
    let wordsToday: Int
}

struct ConfigInfo {
    let freeWordsPerDay: Int
}

class MemberRepo {
    private let config: RepoConfig

    init(config: RepoConfig) {
        self.config = config
    }

    func getMyMember() async throws -> MemberInfo? {
        let result = try await invokeHandler(config: config, name: "member/getMyMember", args: [:])
        guard let member = result["member"] as? [String: Any] else { return nil }
        return MemberInfo(
            plan: member["plan"] as? String ?? "free",
            isOnTrial: member["isOnTrial"] as? Bool ?? false,
            trialEndsAt: member["trialEndsAt"] as? String,
            wordsToday: member["wordsToday"] as? Int ?? 0
        )
    }

    func getFullConfig() async throws -> ConfigInfo? {
        let result = try await invokeHandler(config: config, name: "config/getFullConfig", args: [:])
        guard let cfg = result["config"] as? [String: Any] else { return nil }
        return ConfigInfo(
            freeWordsPerDay: cfg["freeWordsPerDay"] as? Int ?? 0
        )
    }
}
