import XCTest
@testable import Runner

final class SharedAiConfigTests: XCTestCase {
  private var suiteName = ""
  private var defaults: UserDefaults!

  override func setUp() {
    super.setUp()
    suiteName = "SharedAiConfigTests.\(UUID().uuidString)"
    defaults = UserDefaults(suiteName: suiteName)!
    defaults.removePersistentDomain(forName: suiteName)
  }

  override func tearDown() {
    defaults.removePersistentDomain(forName: suiteName)
    defaults = nil
    super.tearDown()
  }

  func testListLocalTranscriptionModelsReadsSelectedState() {
    defaults.set("local", forKey: "voquill_ai_transcription_mode")
    defaults.set("tiny", forKey: "voquill_ai_transcription_model")
    defaults.set(["tiny"], forKey: "voquill_local_transcription_downloaded_models")

    let models = SharedAiConfigBridge.listLocalTranscriptionModels(defaults: defaults)
    let tiny = models.first { ($0["slug"] as? String) == "tiny" }

    XCTAssertEqual(tiny?["downloaded"] as? Bool, true)
    XCTAssertEqual(tiny?["valid"] as? Bool, true)
    XCTAssertEqual(tiny?["selected"] as? Bool, true)
  }

  func testSelectLocalTranscriptionModelPersistsLocalKeys() {
    defaults.set(["tiny"], forKey: "voquill_local_transcription_downloaded_models")

    XCTAssertTrue(
      SharedAiConfigBridge.selectLocalTranscriptionModel(
        slug: "tiny",
        defaults: defaults
      )
    )

    XCTAssertEqual(defaults.string(forKey: "voquill_ai_transcription_mode"), "local")
    XCTAssertEqual(defaults.string(forKey: "voquill_ai_transcription_model"), "tiny")
  }

  func testSelectLocalTranscriptionModelRejectsUndownloadedModel() {
    XCTAssertFalse(
      SharedAiConfigBridge.selectLocalTranscriptionModel(
        slug: "tiny",
        defaults: defaults
      )
    )

    XCTAssertNil(defaults.string(forKey: "voquill_ai_transcription_mode"))
    XCTAssertNil(defaults.string(forKey: "voquill_ai_transcription_model"))
  }

  func testSetKeyboardAiConfigClearsLocalModelWhenRequested() {
    defaults.set("tiny", forKey: "voquill_ai_transcription_model")

    SharedAiConfigBridge.setKeyboardAiConfig(
      args: [
        "transcriptionMode": "local",
        "postProcessingMode": "cloud",
        "clearTranscriptionModel": "true"
      ],
      defaults: defaults
    )

    XCTAssertEqual(defaults.string(forKey: "voquill_ai_transcription_mode"), "local")
    XCTAssertNil(defaults.string(forKey: "voquill_ai_transcription_model"))
  }
}
