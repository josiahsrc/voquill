import XCTest
@testable import Runner

final class SharedAiConfigTests: XCTestCase {
  private var suiteName = ""
  private var defaults: UserDefaults!
  private var containerURL: URL!

  override func setUpWithError() throws {
    try super.setUpWithError()
    suiteName = "SharedAiConfigTests.\(UUID().uuidString)"
    defaults = UserDefaults(suiteName: suiteName)!
    defaults.removePersistentDomain(forName: suiteName)

    let baseURL = FileManager.default.urls(for: .libraryDirectory, in: .userDomainMask).first!
    containerURL = baseURL.appendingPathComponent("SharedAiConfigTests", isDirectory: true)
      .appendingPathComponent(UUID().uuidString, isDirectory: true)
    try FileManager.default.createDirectory(at: containerURL, withIntermediateDirectories: true)
  }

  override func tearDownWithError() throws {
    try? FileManager.default.removeItem(at: containerURL)
    defaults.removePersistentDomain(forName: suiteName)
    defaults = nil
    containerURL = nil
    try super.tearDownWithError()
  }

  func testListLocalTranscriptionModelsReadsSelectedState() throws {
    defaults.set("local", forKey: "voquill_ai_transcription_mode")
    defaults.set("tiny", forKey: "voquill_ai_transcription_model")
    let manager = makeManager()
    try writeArtifact(for: "tiny", using: manager)
    try manager.saveManifest([
      .init(
        slug: "tiny",
        filename: "ggml-tiny.bin",
        sizeBytes: 77_000_000,
        languageSupport: "multilingual",
        downloaded: true,
        valid: true,
        selected: true,
        validationError: nil
      )
    ])

    let models = SharedAiConfigBridge.listLocalTranscriptionModels(defaults: defaults, manager: manager)
    let tiny = models.first { ($0["slug"] as? String) == "tiny" }

    XCTAssertEqual(tiny?["downloaded"] as? Bool, true)
    XCTAssertEqual(tiny?["valid"] as? Bool, true)
    XCTAssertEqual(tiny?["selected"] as? Bool, true)
  }

  func testSelectLocalTranscriptionModelPersistsLocalKeys() throws {
    let manager = makeManager()
    try writeArtifact(for: "tiny", using: manager)

    XCTAssertTrue(
      SharedAiConfigBridge.selectLocalTranscriptionModel(
        slug: "tiny",
        defaults: defaults,
        manager: manager
      )
    )

    XCTAssertEqual(defaults.string(forKey: "voquill_ai_transcription_mode"), "local")
    XCTAssertEqual(defaults.string(forKey: "voquill_ai_transcription_model"), "tiny")
  }

  func testSelectLocalTranscriptionModelRejectsUndownloadedModel() {
    let manager = makeManager()
    XCTAssertFalse(
      SharedAiConfigBridge.selectLocalTranscriptionModel(
        slug: "tiny",
        defaults: defaults,
        manager: manager
      )
    )

    XCTAssertNil(defaults.string(forKey: "voquill_ai_transcription_mode"))
    XCTAssertNil(defaults.string(forKey: "voquill_ai_transcription_model"))
  }

  func testSetKeyboardAiConfigClearsLocalModelWhenRequested() throws {
    defaults.set("tiny", forKey: "voquill_ai_transcription_model")
    let manager = makeManager()
    try writeArtifact(for: "tiny", using: manager)
    XCTAssertTrue(try manager.selectModel(slug: "tiny"))

    SharedAiConfigBridge.setKeyboardAiConfig(
      args: [
        "transcriptionMode": "local",
        "postProcessingMode": "cloud",
        "clearTranscriptionModel": "true"
      ],
      defaults: defaults,
      manager: manager
    )

    XCTAssertEqual(defaults.string(forKey: "voquill_ai_transcription_mode"), "local")
    XCTAssertNil(defaults.string(forKey: "voquill_ai_transcription_model"))
    let tiny = try XCTUnwrap(try manager.listModels().first { $0.slug == "tiny" })
    XCTAssertFalse(tiny.selected)
  }

  private func makeManager() -> LocalTranscriptionModelManager {
    LocalTranscriptionModelManager(
      fileManager: .default,
      defaults: defaults,
      appGroupId: DictationConstants.appGroupId,
      containerURL: containerURL
    )
  }

  private func writeArtifact(for slug: String, using manager: LocalTranscriptionModelManager) throws {
    let url = try manager.modelFileURL(for: slug)
    try FileManager.default.createDirectory(
      at: url.deletingLastPathComponent(),
      withIntermediateDirectories: true
    )
    try Data("artifact".utf8).write(to: url)
  }
}
