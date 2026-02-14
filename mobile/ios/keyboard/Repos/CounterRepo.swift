import Foundation

class CounterRepo {
    private static let counterKey = "voquill_update_counter"

    private let defaults: UserDefaults?

    init() {
        self.defaults = UserDefaults(suiteName: appGroupId)
    }

    func increment() {
        guard let defaults = defaults else { return }
        let counter = defaults.integer(forKey: CounterRepo.counterKey)
        defaults.set(counter + 1, forKey: CounterRepo.counterKey)
    }

    func get() -> Int {
        return defaults?.integer(forKey: CounterRepo.counterKey) ?? 0
    }
}
