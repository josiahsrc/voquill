import Flutter
import UIKit

@main
@objc class AppDelegate: FlutterAppDelegate {
  private static let appGroupId = "group.com.voquill.mobile"

  override func application(
    _ application: UIApplication,
    didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?
  ) -> Bool {
    let controller = window?.rootViewController as! FlutterViewController
    let channel = FlutterMethodChannel(
      name: "com.voquill.mobile/shared",
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

      case "setKeyboardUser":
        guard let args = call.arguments as? [String: String],
              let userName = args["userName"],
              let dictationLanguage = args["dictationLanguage"],
              let defaults = UserDefaults(suiteName: AppDelegate.appGroupId) else {
          result(FlutterError(code: "INVALID_ARGS", message: nil, details: nil))
          return
        }
        defaults.set(userName, forKey: "voquill_user_name")
        defaults.set(dictationLanguage, forKey: "voquill_dictation_language")
        result(nil)

      case "setKeyboardTones":
        guard let args = call.arguments as? [String: Any],
              let selectedToneId = args["selectedToneId"] as? String,
              let activeToneIds = args["activeToneIds"] as? [String],
              let toneById = args["toneById"] as? [String: [String: String]],
              let defaults = UserDefaults(suiteName: AppDelegate.appGroupId) else {
          result(FlutterError(code: "INVALID_ARGS", message: nil, details: nil))
          return
        }
        defaults.set(selectedToneId, forKey: "voquill_selected_tone_id")
        defaults.set(activeToneIds, forKey: "voquill_active_tone_ids")
        if let data = try? JSONSerialization.data(withJSONObject: toneById) {
          defaults.set(data, forKey: "voquill_tone_by_id")
        }
        result(nil)

      case "setKeyboardDictionary":
        guard let args = call.arguments as? [String: Any],
              let termIds = args["termIds"] as? [String],
              let termById = args["termById"] as? [String: [String: Any]],
              let defaults = UserDefaults(suiteName: AppDelegate.appGroupId) else {
          result(FlutterError(code: "INVALID_ARGS", message: nil, details: nil))
          return
        }
        defaults.set(termIds, forKey: "voquill_term_ids")
        if let data = try? JSONSerialization.data(withJSONObject: termById) {
          defaults.set(data, forKey: "voquill_term_by_id")
        }
        result(nil)

      case "getDictationLanguages":
        let defaults = UserDefaults(suiteName: AppDelegate.appGroupId)
        let languages = defaults?.stringArray(forKey: "voquill_dictation_languages") ?? []
        result(languages)

      case "getActiveDictationLanguage":
        let defaults = UserDefaults(suiteName: AppDelegate.appGroupId)
        let language = defaults?.string(forKey: "voquill_dictation_language")
        result(language)

      case "setDictationLanguages":
        guard let args = call.arguments as? [String: Any],
              let languages = args["languages"] as? [String],
              let defaults = UserDefaults(suiteName: AppDelegate.appGroupId) else {
          result(FlutterError(code: "INVALID_ARGS", message: nil, details: nil))
          return
        }
        defaults.set(languages, forKey: "voquill_dictation_languages")
        result(nil)

      case "setActiveDictationLanguage":
        guard let args = call.arguments as? [String: String],
              let language = args["language"],
              let defaults = UserDefaults(suiteName: AppDelegate.appGroupId) else {
          result(FlutterError(code: "INVALID_ARGS", message: nil, details: nil))
          return
        }
        defaults.set(language, forKey: "voquill_dictation_language")
        result(nil)

      case "getTranscriptions":
        let defaults = UserDefaults(suiteName: AppDelegate.appGroupId)
        let transcriptions = defaults?.array(forKey: "voquill_transcriptions") as? [[String: Any]] ?? []
        result(transcriptions)

      case "getAppCounter":
        let defaults = UserDefaults(suiteName: AppDelegate.appGroupId)
        let counter = defaults?.integer(forKey: "voquill_app_update_counter") ?? 0
        result(counter)

      case "incrementKeyboardCounter":
        let defaults = UserDefaults(suiteName: AppDelegate.appGroupId)
        let counter = defaults?.integer(forKey: "voquill_keyboard_update_counter") ?? 0
        defaults?.set(counter + 1, forKey: "voquill_keyboard_update_counter")
        result(nil)

      case "stopDictation":
        DictationService.shared.stopDictation()
        result(nil)

      case "getDictationPhase":
        result(DictationService.shared.currentPhase.rawValue)

      default:
        result(FlutterMethodNotImplemented)
      }
    }

    GeneratedPluginRegistrant.register(with: self)

    if let url = launchOptions?[.url] as? URL {
      handleDictationURL(url)
    }

    return super.application(application, didFinishLaunchingWithOptions: launchOptions)
  }

  override func application(_ app: UIApplication, open url: URL, options: [UIApplication.OpenURLOptionsKey: Any] = [:]) -> Bool {
    if handleDictationURL(url) {
      return true
    }
    return super.application(app, open: url, options: options)
  }

  @discardableResult
  private func handleDictationURL(_ url: URL) -> Bool {
    guard url.scheme == "voquill", url.host == "dictate" else { return false }
    let components = URLComponents(url: url, resolvingAgainstBaseURL: false)
    let toneId = components?.queryItems?.first(where: { $0.name == "tone" })?.value
    let language = components?.queryItems?.first(where: { $0.name == "lang" })?.value
    DictationService.shared.startDictation(toneId: toneId, language: language)
    return true
  }
}
