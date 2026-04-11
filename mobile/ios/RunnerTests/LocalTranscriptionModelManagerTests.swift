import XCTest
@testable import Runner

final class LocalTranscriptionModelManagerTests: XCTestCase {
  actor DownloadRecorder {
    private var source: URL?

    func record(_ source: URL) {
      self.source = source
    }

    func value() -> URL? {
      source
    }
  }

  private var suiteName = ""
  private var defaults: UserDefaults!
  private var containerURL: URL!

  override func setUpWithError() throws {
    try super.setUpWithError()
    suiteName = "LocalTranscriptionModelManagerTests.\(UUID().uuidString)"
    defaults = UserDefaults(suiteName: suiteName)!
    defaults.removePersistentDomain(forName: suiteName)

    let baseURL = FileManager.default.urls(for: .libraryDirectory, in: .userDomainMask).first!
    containerURL = baseURL.appendingPathComponent("LocalTranscriptionModelManagerTests", isDirectory: true)
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

  func testListModelsMarksDownloadedModelAsSelectedAndValid() throws {
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

    let models = try manager.listModels()
    let tiny = try XCTUnwrap(models.first { $0.slug == "tiny" })

    XCTAssertEqual(tiny.filename, "ggml-tiny.bin")
    XCTAssertEqual(
      tiny.downloadURL.absoluteString,
      "https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-tiny.bin"
    )
    XCTAssertTrue(tiny.downloaded)
    XCTAssertTrue(tiny.valid)
    XCTAssertTrue(tiny.selected)
  }

  func testDownloadModelStoresArtifactAndMarksItValid() async throws {
    let recorder = DownloadRecorder()
    let manager = makeManager { source, destination in
      await recorder.record(source)
      try Data("tiny-model".utf8).write(to: destination)
    }

    try await manager.downloadModel(slug: "tiny")

    let tiny = try XCTUnwrap(try manager.listModels().first { $0.slug == "tiny" })
    let downloadedSource = await recorder.value()?.absoluteString
    XCTAssertEqual(downloadedSource, "https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-tiny.bin")
    XCTAssertTrue(FileManager.default.fileExists(atPath: try manager.modelFileURL(for: "tiny").path))
    XCTAssertTrue(tiny.downloaded)
    XCTAssertTrue(tiny.valid)
    XCTAssertFalse(tiny.selected)
  }

  func testSelectModelRequiresValidatedArtifact() throws {
    let manager = makeManager()

    XCTAssertFalse(try manager.selectModel(slug: "tiny"))

    try writeArtifact(for: "tiny", using: manager)

    XCTAssertTrue(try manager.selectModel(slug: "tiny"))

    let tiny = try XCTUnwrap(try manager.listModels().first { $0.slug == "tiny" })
    XCTAssertTrue(tiny.selected)
    XCTAssertTrue(tiny.valid)
  }

  func testDeleteModelRemovesArtifactAndClearsSelection() throws {
    let manager = makeManager()
    try writeArtifact(for: "tiny", using: manager)
    XCTAssertTrue(try manager.selectModel(slug: "tiny"))

    XCTAssertTrue(try manager.deleteModel(slug: "tiny"))

    let tiny = try XCTUnwrap(try manager.listModels().first { $0.slug == "tiny" })
    XCTAssertFalse(FileManager.default.fileExists(atPath: try manager.modelFileURL(for: "tiny").path))
    XCTAssertFalse(tiny.downloaded)
    XCTAssertFalse(tiny.valid)
    XCTAssertFalse(tiny.selected)
  }

  func testValidateModelMarksMissingArtifactInvalidAndClearsSelection() throws {
    let manager = makeManager()
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

    XCTAssertFalse(try manager.validateModel(slug: "tiny"))

    let tiny = try XCTUnwrap(try manager.listModels().first { $0.slug == "tiny" })
    XCTAssertFalse(tiny.downloaded)
    XCTAssertFalse(tiny.valid)
    XCTAssertFalse(tiny.selected)
    XCTAssertEqual(tiny.validationError, "Model file is missing.")
  }

  private func makeManager(
    downloadHandler: @escaping LocalTranscriptionModelManager.DownloadHandler = { _, _ in }
  ) -> LocalTranscriptionModelManager {
    LocalTranscriptionModelManager(
      fileManager: .default,
      defaults: defaults,
      appGroupId: DictationConstants.appGroupId,
      containerURL: containerURL,
      downloadHandler: downloadHandler
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
