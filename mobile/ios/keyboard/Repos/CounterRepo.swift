import Foundation

class CounterRepo {
    private static let appCounterKey = "voquill_app_update_counter"
    private static let keyboardCounterKey = "voquill_keyboard_update_counter"

    private let defaults: UserDefaults?

    init() {
        self.defaults = UserDefaults(suiteName: appGroupId)
    }

    func incrementApp() {
        guard let defaults = defaults else { return }
        let counter = defaults.integer(forKey: CounterRepo.appCounterKey)
        defaults.set(counter + 1, forKey: CounterRepo.appCounterKey)
    }

    func getApp() -> Int {
        return defaults?.integer(forKey: CounterRepo.appCounterKey) ?? 0
    }

    func incrementKeyboard() {
        guard let defaults = defaults else { return }
        let counter = defaults.integer(forKey: CounterRepo.keyboardCounterKey)
        defaults.set(counter + 1, forKey: CounterRepo.keyboardCounterKey)
    }

    func getKeyboard() -> Int {
        return defaults?.integer(forKey: CounterRepo.keyboardCounterKey) ?? 0
    }
}
