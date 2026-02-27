import Foundation

class DarwinNotificationManager {
    static let shared = DarwinNotificationManager()

    private var callbacks: [String: () -> Void] = [:]

    private init() {}

    func post(_ name: String) {
        let center = CFNotificationCenterGetDarwinNotifyCenter()
        CFNotificationCenterPostNotification(center, CFNotificationName(name as CFString), nil, nil, true)
    }

    func observe(_ name: String, callback: @escaping () -> Void) {
        callbacks[name] = callback
        let center = CFNotificationCenterGetDarwinNotifyCenter()
        CFNotificationCenterAddObserver(
            center,
            Unmanaged.passUnretained(self).toOpaque(),
            { _, observer, notificationName, _, _ in
                guard let observer = observer,
                      let notificationName = notificationName else { return }
                let mgr = Unmanaged<DarwinNotificationManager>.fromOpaque(observer).takeUnretainedValue()
                let name = notificationName.rawValue as String
                DispatchQueue.main.async {
                    mgr.callbacks[name]?()
                }
            },
            name as CFString,
            nil,
            .deliverImmediately
        )
    }

    func removeObserver(_ name: String) {
        let center = CFNotificationCenterGetDarwinNotifyCenter()
        CFNotificationCenterRemoveObserver(center, Unmanaged.passUnretained(self).toOpaque(), CFNotificationName(name as CFString), nil)
        callbacks.removeValue(forKey: name)
    }

    func removeAll() {
        let center = CFNotificationCenterGetDarwinNotifyCenter()
        CFNotificationCenterRemoveEveryObserver(center, Unmanaged.passUnretained(self).toOpaque())
        callbacks.removeAll()
    }
}
