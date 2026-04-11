import Flutter
import UIKit

struct SharedAiConfigBridge {
  struct LocalModelDefinition {
    let slug: String
    let label: String
    let helper: String
    let sizeBytes: Int
    let languageSupport: String
  }

  static let downloadedModelsKey = "voquill_local_transcription_downloaded_models"

  static let supportedLocalModels: [LocalModelDefinition] = [
    .init(
      slug: "tiny",
      label: "Whisper Tiny (77 MB)",
      helper: "Fastest, lowest accuracy",
      sizeBytes: 77_000_000,
      languageSupport: "multilingual"
    ),
    .init(
      slug: "base",
      label: "Whisper Base (148 MB)",
      helper: "Great balance of speed and accuracy",
      sizeBytes: 148_000_000,
      languageSupport: "multilingual"
    ),
    .init(
      slug: "small",
      label: "Whisper Small (488 MB)",
      helper: "Recommended with GPU acceleration",
      sizeBytes: 488_000_000,
      languageSupport: "multilingual"
    ),
    .init(
      slug: "medium",
      label: "Whisper Medium (1.53 GB)",
      helper: "Balanced quality and speed",
      sizeBytes: 1_530_000_000,
      languageSupport: "multilingual"
    ),
    .init(
      slug: "turbo",
      label: "Whisper Large v3 Turbo (1.6 GB)",
      helper: "Fast large model, great accuracy",
      sizeBytes: 1_600_000_000,
      languageSupport: "multilingual"
    ),
    .init(
      slug: "large",
      label: "Whisper Large v3 (3.1 GB)",
      helper: "Highest accuracy, requires GPU",
      sizeBytes: 3_100_000_000,
      languageSupport: "multilingual"
    )
  ]

  static func setKeyboardAiConfig(args: [String: String], defaults: UserDefaults) {
    let transcriptionMode = args["transcriptionMode"]
    let postProcessingMode = args["postProcessingMode"]
    let clearTranscriptionModel = args["clearTranscriptionModel"] == "true"

    defaults.set(transcriptionMode, forKey: "voquill_ai_transcription_mode")
    defaults.set(postProcessingMode, forKey: "voquill_ai_post_processing_mode")
    if let provider = args["transcriptionProvider"] {
      defaults.set(provider, forKey: "voquill_ai_transcription_provider")
    } else {
      defaults.removeObject(forKey: "voquill_ai_transcription_provider")
    }
    if let apiKey = args["transcriptionApiKey"] {
      defaults.set(apiKey, forKey: "voquill_ai_transcription_api_key")
    } else {
      defaults.removeObject(forKey: "voquill_ai_transcription_api_key")
    }
    if let provider = args["postProcessingProvider"] {
      defaults.set(provider, forKey: "voquill_ai_post_processing_provider")
    } else {
      defaults.removeObject(forKey: "voquill_ai_post_processing_provider")
    }
    if let apiKey = args["postProcessingApiKey"] {
      defaults.set(apiKey, forKey: "voquill_ai_post_processing_api_key")
    } else {
      defaults.removeObject(forKey: "voquill_ai_post_processing_api_key")
    }
    if let baseUrl = args["transcriptionBaseUrl"] {
      defaults.set(baseUrl, forKey: "voquill_ai_transcription_base_url")
    } else {
      defaults.removeObject(forKey: "voquill_ai_transcription_base_url")
    }
    if let baseUrl = args["postProcessingBaseUrl"] {
      defaults.set(baseUrl, forKey: "voquill_ai_post_processing_base_url")
    } else {
      defaults.removeObject(forKey: "voquill_ai_post_processing_base_url")
    }
    if clearTranscriptionModel {
      defaults.removeObject(forKey: "voquill_ai_transcription_model")
    } else if let model = args["transcriptionModel"] {
      defaults.set(model, forKey: "voquill_ai_transcription_model")
    } else {
      defaults.removeObject(forKey: "voquill_ai_transcription_model")
    }
    if let model = args["postProcessingModel"] {
      defaults.set(model, forKey: "voquill_ai_post_processing_model")
    } else {
      defaults.removeObject(forKey: "voquill_ai_post_processing_model")
    }
    if let azureRegion = args["transcriptionAzureRegion"] {
      defaults.set(azureRegion, forKey: "voquill_ai_transcription_azure_region")
    } else {
      defaults.removeObject(forKey: "voquill_ai_transcription_azure_region")
    }
  }

  static func listLocalTranscriptionModels(defaults: UserDefaults?) -> [[String: Any]] {
    let downloaded = Set(defaults?.stringArray(forKey: downloadedModelsKey) ?? [])
    let transcriptionMode = defaults?.string(forKey: "voquill_ai_transcription_mode")
    let selectedModel = defaults?.string(forKey: "voquill_ai_transcription_model")

    return supportedLocalModels.map { model in
      let isDownloaded = downloaded.contains(model.slug)
      return [
        "slug": model.slug,
        "label": model.label,
        "helper": model.helper,
        "sizeBytes": model.sizeBytes,
        "languageSupport": model.languageSupport,
        "downloaded": isDownloaded,
        "valid": isDownloaded,
        "selected": transcriptionMode == "local" && selectedModel == model.slug
      ]
    }
  }

  static func downloadLocalTranscriptionModel(slug: String, defaults: UserDefaults) -> Bool {
    guard supportedLocalModels.contains(where: { $0.slug == slug }) else {
      return false
    }

    var downloaded = defaults.stringArray(forKey: downloadedModelsKey) ?? []
    if !downloaded.contains(slug) {
      downloaded.append(slug)
      defaults.set(downloaded, forKey: downloadedModelsKey)
    }
    return true
  }

  static func deleteLocalTranscriptionModel(slug: String, defaults: UserDefaults) -> Bool {
    guard supportedLocalModels.contains(where: { $0.slug == slug }) else {
      return false
    }

    var downloaded = defaults.stringArray(forKey: downloadedModelsKey) ?? []
    downloaded.removeAll { $0 == slug }
    defaults.set(downloaded, forKey: downloadedModelsKey)
    if defaults.string(forKey: "voquill_ai_transcription_model") == slug {
      defaults.removeObject(forKey: "voquill_ai_transcription_model")
    }
    return true
  }

  static func selectLocalTranscriptionModel(slug: String, defaults: UserDefaults) -> Bool {
    guard supportedLocalModels.contains(where: { $0.slug == slug }) else {
      return false
    }
    let downloaded = Set(defaults.stringArray(forKey: downloadedModelsKey) ?? [])
    guard downloaded.contains(slug) else {
      return false
    }

    defaults.set("local", forKey: "voquill_ai_transcription_mode")
    defaults.set(slug, forKey: "voquill_ai_transcription_model")
    return true
  }
}

@main
@objc class AppDelegate: FlutterAppDelegate {
  private static let appGroupId = "group.com.voquill.mobile"
  private var channel: FlutterMethodChannel?

  override func application(
    _ application: UIApplication,
    didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?
  ) -> Bool {
    DictationService.shared.cleanupOnLaunch()

    let controller = window?.rootViewController as! FlutterViewController
    let channel = FlutterMethodChannel(
      name: "com.voquill.mobile/shared",
      binaryMessenger: controller.binaryMessenger
    )
    self.channel = channel

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

      case "setMixpanelUser":
        guard let args = call.arguments as? [String: String],
              let uid = args["uid"],
              let defaults = UserDefaults(suiteName: AppDelegate.appGroupId) else {
          result(FlutterError(code: "INVALID_ARGS", message: nil, details: nil))
          return
        }
        defaults.set(uid, forKey: "voquill_mixpanel_uid")
        result(nil)

      case "setMixpanelToken":
        guard let args = call.arguments as? [String: String],
              let token = args["token"],
              let defaults = UserDefaults(suiteName: AppDelegate.appGroupId) else {
          result(FlutterError(code: "INVALID_ARGS", message: nil, details: nil))
          return
        }
        defaults.set(token, forKey: "voquill_mixpanel_token")
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

      case "getSelectedToneId":
        let defaults = UserDefaults(suiteName: AppDelegate.appGroupId)
        result(defaults?.string(forKey: "voquill_selected_tone_id"))

      case "setSelectedToneId":
        guard let args = call.arguments as? [String: String],
              let toneId = args["toneId"],
              let defaults = UserDefaults(suiteName: AppDelegate.appGroupId) else {
          result(FlutterError(code: "INVALID_ARGS", message: nil, details: nil))
          return
        }
        defaults.set(toneId, forKey: "voquill_selected_tone_id")
        result(nil)

      case "getAppCounter":
        let defaults = UserDefaults(suiteName: AppDelegate.appGroupId)
        let counter = defaults?.integer(forKey: "voquill_app_update_counter") ?? 0
        result(counter)

      case "incrementKeyboardCounter":
        let defaults = UserDefaults(suiteName: AppDelegate.appGroupId)
        let counter = defaults?.integer(forKey: "voquill_keyboard_update_counter") ?? 0
        defaults?.set(counter + 1, forKey: "voquill_keyboard_update_counter")
        result(nil)

      case "isKeyboardEnabled":
        let bundleId = Bundle.main.bundleIdentifier ?? ""
        let keyboardBundleId = bundleId + ".keyboard"
        let keyboards = UserDefaults.standard.object(forKey: "AppleKeyboards") as? [String] ?? []
        result(keyboards.contains(where: { $0.hasPrefix(keyboardBundleId) }))

      case "openKeyboardSettings":
        if let url = URL(string: UIApplication.openSettingsURLString) {
          UIApplication.shared.open(url)
        }
        result(nil)

      case "setKeyboardAiConfig":
        guard let args = call.arguments as? [String: String],
              args["transcriptionMode"] != nil,
              args["postProcessingMode"] != nil,
              let defaults = UserDefaults(suiteName: AppDelegate.appGroupId) else {
          result(FlutterError(code: "INVALID_ARGS", message: nil, details: nil))
          return
        }
        SharedAiConfigBridge.setKeyboardAiConfig(args: args, defaults: defaults)
        result(nil)

      case "listLocalTranscriptionModels":
        let defaults = UserDefaults(suiteName: AppDelegate.appGroupId)
        result(SharedAiConfigBridge.listLocalTranscriptionModels(defaults: defaults))

      case "downloadLocalTranscriptionModel":
        guard let args = call.arguments as? [String: String],
              let slug = args["slug"],
              let defaults = UserDefaults(suiteName: AppDelegate.appGroupId),
              SharedAiConfigBridge.downloadLocalTranscriptionModel(slug: slug, defaults: defaults) else {
          result(FlutterError(code: "INVALID_ARGS", message: nil, details: nil))
          return
        }
        result(nil)

      case "deleteLocalTranscriptionModel":
        guard let args = call.arguments as? [String: String],
              let slug = args["slug"],
              let defaults = UserDefaults(suiteName: AppDelegate.appGroupId),
              SharedAiConfigBridge.deleteLocalTranscriptionModel(slug: slug, defaults: defaults) else {
          result(FlutterError(code: "INVALID_ARGS", message: nil, details: nil))
          return
        }
        result(nil)

      case "selectLocalTranscriptionModel":
        guard let args = call.arguments as? [String: String],
              let slug = args["slug"],
              let defaults = UserDefaults(suiteName: AppDelegate.appGroupId),
              SharedAiConfigBridge.selectLocalTranscriptionModel(slug: slug, defaults: defaults) else {
          result(FlutterError(code: "INVALID_ARGS", message: nil, details: nil))
          return
        }
        result(nil)

      case "startDictation":
        DictationService.shared.startDictation()
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

  override func applicationWillTerminate(_ application: UIApplication) {
    DictationService.shared.stopDictation()
    super.applicationWillTerminate(application)
  }

  @discardableResult
  private func handleDictationURL(_ url: URL) -> Bool {
    guard url.scheme == "voquill" else { return false }

    switch url.host {
    case "dictate":
      let wasActive = UIApplication.shared.applicationState == .active
      DictationService.shared.startDictation()
      if !wasActive {
        channel?.invokeMethod("showDictationDialog", arguments: nil)
      }
      return true
    case "stop":
      DictationService.shared.stopDictation()
      return true
    case "open":
      return true
    case "upgrade":
      channel?.invokeMethod("showPaywall", arguments: nil)
      return true
    default:
      return false
    }
  }
}
