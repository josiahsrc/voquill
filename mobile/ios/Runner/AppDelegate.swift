import Flutter
import UIKit

struct SharedAiConfigBridge {
  static func setKeyboardAiConfig(
    args: [String: String],
    defaults: UserDefaults,
    manager: LocalTranscriptionModelManager? = nil
  ) {
    let manager = manager ?? LocalTranscriptionModelManager(
      defaults: defaults,
      appGroupId: DictationConstants.appGroupId
    )
    let transcriptionMode = args["transcriptionMode"]
    let postProcessingMode = args["postProcessingMode"]
    let clearTranscriptionModel = args["clearTranscriptionModel"] == "true"

    defaults.set(transcriptionMode, forKey: LocalTranscriptionModelManager.transcriptionModeKey)
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
      defaults.removeObject(forKey: LocalTranscriptionModelManager.transcriptionModelKey)
      try? manager.clearSelection()
    } else if transcriptionMode == "local", let model = args["transcriptionModel"] {
      if (try? manager.selectModel(slug: model)) == true {
        defaults.set(model, forKey: LocalTranscriptionModelManager.transcriptionModelKey)
      } else {
        defaults.removeObject(forKey: LocalTranscriptionModelManager.transcriptionModelKey)
      }
    } else if let model = args["transcriptionModel"] {
      defaults.set(model, forKey: LocalTranscriptionModelManager.transcriptionModelKey)
    } else {
      defaults.removeObject(forKey: LocalTranscriptionModelManager.transcriptionModelKey)
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

  static func listLocalTranscriptionModels(
    defaults: UserDefaults?,
    manager: LocalTranscriptionModelManager? = nil
  ) -> [[String: Any]] {
    let manager = manager ?? LocalTranscriptionModelManager(
      defaults: defaults,
      appGroupId: DictationConstants.appGroupId
    )
    let selectedModel = defaults?.string(forKey: LocalTranscriptionModelManager.transcriptionModelKey)

    do {
      return try manager.listModels().map { model in
        model.asDictionary(
          selectedOverride:
            selectedModel == model.slug
            && model.selected
            && model.valid
        )
      }
    } catch {
      return LocalTranscriptionModelManager.supportedModels.map { model in
        [
          "slug": model.slug,
          "label": model.label,
          "helper": model.helper,
          "sizeBytes": model.sizeBytes,
          "languageSupport": model.languageSupport,
          "downloaded": false,
          "valid": false,
          "selected": false
        ]
      }
    }
  }

  static func downloadLocalTranscriptionModel(
    slug: String,
    defaults: UserDefaults,
    manager: LocalTranscriptionModelManager? = nil
  ) async -> Bool {
    let manager = manager ?? LocalTranscriptionModelManager(
      defaults: defaults,
      appGroupId: DictationConstants.appGroupId
    )

    do {
      return try await manager.downloadModel(slug: slug)
    } catch {
      return false
    }
  }

  static func deleteLocalTranscriptionModel(
    slug: String,
    defaults: UserDefaults,
    manager: LocalTranscriptionModelManager? = nil
  ) -> Bool {
    let manager = manager ?? LocalTranscriptionModelManager(
      defaults: defaults,
      appGroupId: DictationConstants.appGroupId
    )

    do {
      guard try manager.deleteModel(slug: slug) else {
        return false
      }
      if defaults.string(forKey: LocalTranscriptionModelManager.transcriptionModelKey) == slug {
        defaults.removeObject(forKey: LocalTranscriptionModelManager.transcriptionModelKey)
      }
      return true
    } catch {
      return false
    }
  }

  static func selectLocalTranscriptionModel(
    slug: String,
    defaults: UserDefaults,
    manager: LocalTranscriptionModelManager? = nil
  ) -> Bool {
    let manager = manager ?? LocalTranscriptionModelManager(
      defaults: defaults,
      appGroupId: DictationConstants.appGroupId
    )

    do {
      guard try manager.selectModel(slug: slug) else {
        return false
      }
      defaults.set("local", forKey: LocalTranscriptionModelManager.transcriptionModeKey)
      defaults.set(slug, forKey: LocalTranscriptionModelManager.transcriptionModelKey)
      return true
    } catch {
      return false
    }
  }
}

@main
@objc class AppDelegate: FlutterAppDelegate {
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
              let defaults = UserDefaults(suiteName: DictationConstants.appGroupId) else {
          result(FlutterError(code: "INVALID_ARGS", message: nil, details: nil))
          return
        }
        defaults.set(apiRefreshToken, forKey: "voquill_api_refresh_token")
        defaults.set(apiKey, forKey: "voquill_api_key")
        defaults.set(functionUrl, forKey: "voquill_function_url")
        defaults.set(authUrl, forKey: "voquill_auth_url")
        result(nil)

      case "clearKeyboardAuth":
        if let defaults = UserDefaults(suiteName: DictationConstants.appGroupId) {
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
              let defaults = UserDefaults(suiteName: DictationConstants.appGroupId) else {
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
              let defaults = UserDefaults(suiteName: DictationConstants.appGroupId) else {
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
              let defaults = UserDefaults(suiteName: DictationConstants.appGroupId) else {
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
              let defaults = UserDefaults(suiteName: DictationConstants.appGroupId) else {
          result(FlutterError(code: "INVALID_ARGS", message: nil, details: nil))
          return
        }
        defaults.set(uid, forKey: "voquill_mixpanel_uid")
        result(nil)

      case "setMixpanelToken":
        guard let args = call.arguments as? [String: String],
              let token = args["token"],
              let defaults = UserDefaults(suiteName: DictationConstants.appGroupId) else {
          result(FlutterError(code: "INVALID_ARGS", message: nil, details: nil))
          return
        }
        defaults.set(token, forKey: "voquill_mixpanel_token")
        result(nil)

      case "getDictationLanguages":
        let defaults = UserDefaults(suiteName: DictationConstants.appGroupId)
        let languages = defaults?.stringArray(forKey: "voquill_dictation_languages") ?? []
        result(languages)

      case "getActiveDictationLanguage":
        let defaults = UserDefaults(suiteName: DictationConstants.appGroupId)
        let language = defaults?.string(forKey: "voquill_dictation_language")
        result(language)

      case "setDictationLanguages":
        guard let args = call.arguments as? [String: Any],
              let languages = args["languages"] as? [String],
              let defaults = UserDefaults(suiteName: DictationConstants.appGroupId) else {
          result(FlutterError(code: "INVALID_ARGS", message: nil, details: nil))
          return
        }
        defaults.set(languages, forKey: "voquill_dictation_languages")
        result(nil)

      case "setActiveDictationLanguage":
        guard let args = call.arguments as? [String: String],
              let language = args["language"],
              let defaults = UserDefaults(suiteName: DictationConstants.appGroupId) else {
          result(FlutterError(code: "INVALID_ARGS", message: nil, details: nil))
          return
        }
        defaults.set(language, forKey: "voquill_dictation_language")
        result(nil)

      case "getTranscriptions":
        let defaults = UserDefaults(suiteName: DictationConstants.appGroupId)
        let transcriptions = defaults?.array(forKey: "voquill_transcriptions") as? [[String: Any]] ?? []
        result(transcriptions)

      case "getSelectedToneId":
        let defaults = UserDefaults(suiteName: DictationConstants.appGroupId)
        result(defaults?.string(forKey: "voquill_selected_tone_id"))

      case "setSelectedToneId":
        guard let args = call.arguments as? [String: String],
              let toneId = args["toneId"],
              let defaults = UserDefaults(suiteName: DictationConstants.appGroupId) else {
          result(FlutterError(code: "INVALID_ARGS", message: nil, details: nil))
          return
        }
        defaults.set(toneId, forKey: "voquill_selected_tone_id")
        result(nil)

      case "getAppCounter":
        let defaults = UserDefaults(suiteName: DictationConstants.appGroupId)
        let counter = defaults?.integer(forKey: "voquill_app_update_counter") ?? 0
        result(counter)

      case "incrementKeyboardCounter":
        let defaults = UserDefaults(suiteName: DictationConstants.appGroupId)
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
              let defaults = UserDefaults(suiteName: DictationConstants.appGroupId) else {
          result(FlutterError(code: "INVALID_ARGS", message: nil, details: nil))
          return
        }
        SharedAiConfigBridge.setKeyboardAiConfig(args: args, defaults: defaults)
        result(nil)

      case "listLocalTranscriptionModels":
        let defaults = UserDefaults(suiteName: DictationConstants.appGroupId)
        result(SharedAiConfigBridge.listLocalTranscriptionModels(defaults: defaults))

      case "downloadLocalTranscriptionModel":
        guard let args = call.arguments as? [String: String],
              let slug = args["slug"],
              let defaults = UserDefaults(suiteName: DictationConstants.appGroupId) else {
          result(FlutterError(code: "INVALID_ARGS", message: nil, details: nil))
          return
        }
        Task {
          let didDownload = await SharedAiConfigBridge.downloadLocalTranscriptionModel(
            slug: slug,
            defaults: defaults
          )
          DispatchQueue.main.async {
            if didDownload {
              result(nil)
            } else {
              result(FlutterError(code: "INVALID_ARGS", message: nil, details: nil))
            }
          }
        }

      case "deleteLocalTranscriptionModel":
        guard let args = call.arguments as? [String: String],
              let slug = args["slug"],
              let defaults = UserDefaults(suiteName: DictationConstants.appGroupId),
              SharedAiConfigBridge.deleteLocalTranscriptionModel(slug: slug, defaults: defaults) else {
          result(FlutterError(code: "INVALID_ARGS", message: nil, details: nil))
          return
        }
        result(nil)

      case "selectLocalTranscriptionModel":
        guard let args = call.arguments as? [String: String],
              let slug = args["slug"],
              let defaults = UserDefaults(suiteName: DictationConstants.appGroupId),
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
