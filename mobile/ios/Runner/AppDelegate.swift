import Flutter
import UIKit

@main
@objc class AppDelegate: FlutterAppDelegate {
  private static let appGroupId = "group.com.voquill.app"

  override func application(
    _ application: UIApplication,
    didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?
  ) -> Bool {
    let controller = window?.rootViewController as! FlutterViewController
    let channel = FlutterMethodChannel(
      name: "com.voquill.app/shared",
      binaryMessenger: controller.binaryMessenger
    )

    channel.setMethodCallHandler { (call, result) in
      switch call.method {
      case "setKeyboardAuth":
        guard let args = call.arguments as? [String: String],
              let apiRefreshToken = args["apiRefreshToken"],
              let apiKey = args["apiKey"],
              let functionUrl = args["functionUrl"],
              let authUrl = args["authUrl"],
              let defaults = UserDefaults(suiteName: AppDelegate.appGroupId) else {
          result(FlutterError(code: "INVALID_ARGS", message: nil, details: nil))
          return
        }
        defaults.set(apiRefreshToken, forKey: "voquill_api_refresh_token")
        defaults.set(apiKey, forKey: "voquill_api_key")
        defaults.set(functionUrl, forKey: "voquill_function_url")
        defaults.set(authUrl, forKey: "voquill_auth_url")
        result(nil)

      case "clearKeyboardAuth":
        if let defaults = UserDefaults(suiteName: AppDelegate.appGroupId) {
          defaults.removeObject(forKey: "voquill_api_refresh_token")
          defaults.removeObject(forKey: "voquill_api_key")
          defaults.removeObject(forKey: "voquill_function_url")
          defaults.removeObject(forKey: "voquill_auth_url")
        }
        result(nil)

      default:
        result(FlutterMethodNotImplemented)
      }
    }

    GeneratedPluginRegistrant.register(with: self)
    return super.application(application, didFinishLaunchingWithOptions: launchOptions)
  }
}
