import Foundation

struct SharedTone {
    let name: String
    let promptTemplate: String

    static func loadFromDefaults(_ defaults: UserDefaults) -> (selectedToneId: String?, activeToneIds: [String]?, toneById: [String: SharedTone]?) {
        let selectedToneId = defaults.string(forKey: "voquill_selected_tone_id")
        let activeToneIds = defaults.stringArray(forKey: "voquill_active_tone_ids")

        var toneById: [String: SharedTone]?
        if let data = defaults.data(forKey: "voquill_tone_by_id"),
           let dict = try? JSONSerialization.jsonObject(with: data) as? [String: [String: String]] {
            var map = [String: SharedTone]()
            for (id, fields) in dict {
                if let name = fields["name"], let promptTemplate = fields["promptTemplate"] {
                    map[id] = SharedTone(name: name, promptTemplate: promptTemplate)
                }
            }
            toneById = map
        }

        return (selectedToneId, activeToneIds, toneById)
    }
}
