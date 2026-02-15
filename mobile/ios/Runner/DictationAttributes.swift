import ActivityKit
import Foundation

struct DictationAttributes: ActivityAttributes {
    public struct ContentState: Codable, Hashable {
        var phase: String
        var elapsedSeconds: Int
    }
}
