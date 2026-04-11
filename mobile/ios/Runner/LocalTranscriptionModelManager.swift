import Foundation

final class LocalTranscriptionModelManager {
  typealias DownloadHandler = @Sendable (_ source: URL, _ destination: URL) async throws -> Void

  struct CatalogEntry: Equatable {
    let slug: String
    let label: String
    let helper: String
    let sizeBytes: Int64
    let languageSupport: String
    let filename: String
    let downloadURL: URL
  }

  struct LocalModelRecord: Codable, Equatable {
    let slug: String
    let filename: String
    let sizeBytes: Int64
    let languageSupport: String
    var downloaded: Bool
    var valid: Bool
    var selected: Bool
    var validationError: String?
  }

  struct Model: Equatable {
    let slug: String
    let label: String
    let helper: String
    let sizeBytes: Int64
    let languageSupport: String
    let filename: String
    let downloadURL: URL
    let downloaded: Bool
    let valid: Bool
    let selected: Bool
    let validationError: String?

    func asDictionary(selectedOverride: Bool? = nil) -> [String: Any] {
      var dictionary: [String: Any] = [
        "slug": slug,
        "label": label,
        "helper": helper,
        "sizeBytes": sizeBytes,
        "languageSupport": languageSupport,
        "downloaded": downloaded,
        "valid": valid,
        "selected": selectedOverride ?? selected
      ]
      if let validationError {
        dictionary["validationError"] = validationError
      }
      return dictionary
    }
  }

  enum ManagerError: LocalizedError {
    case appGroupUnavailable(String)
    case unsupportedModel(String)
    case invalidHTTPResponse(Int)
    case invalidDownloadedArtifact(String)

    var errorDescription: String? {
      switch self {
      case .appGroupUnavailable(let appGroupId):
        return "Missing App Group container for \(appGroupId)."
      case .unsupportedModel(let slug):
        return "Unsupported local model: \(slug)."
      case .invalidHTTPResponse(let statusCode):
        return "Model download failed with status code \(statusCode)."
      case .invalidDownloadedArtifact(let slug):
        return "Downloaded artifact for \(slug) failed validation."
      }
    }
  }

  static let transcriptionModeKey = "voquill_ai_transcription_mode"
  static let transcriptionModelKey = "voquill_ai_transcription_model"
  static let liveDownloadHandler: DownloadHandler = { source, destination in
    let (temporaryURL, response) = try await withCheckedThrowingContinuation {
      (continuation: CheckedContinuation<(URL, URLResponse), Error>) in
      let task = URLSession.shared.downloadTask(with: source) { temporaryURL, response, error in
        if let error {
          continuation.resume(throwing: error)
          return
        }
        guard let temporaryURL, let response else {
          continuation.resume(throwing: ManagerError.invalidDownloadedArtifact(source.absoluteString))
          return
        }
        continuation.resume(returning: (temporaryURL, response))
      }
      task.resume()
    }

    if let httpResponse = response as? HTTPURLResponse,
       !(200..<300).contains(httpResponse.statusCode) {
      throw ManagerError.invalidHTTPResponse(httpResponse.statusCode)
    }

    if FileManager.default.fileExists(atPath: destination.path) {
      try FileManager.default.removeItem(at: destination)
    }
    try FileManager.default.moveItem(at: temporaryURL, to: destination)
  }

  static let supportedModels: [CatalogEntry] = [
    .init(
      slug: "tiny",
      label: "Whisper Tiny (77 MB)",
      helper: "Fastest, lowest accuracy",
      sizeBytes: 77_000_000,
      languageSupport: "multilingual",
      filename: "ggml-tiny.bin",
      downloadURL: URL(string: "https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-tiny.bin")!
    ),
    .init(
      slug: "base",
      label: "Whisper Base (148 MB)",
      helper: "Great balance of speed and accuracy",
      sizeBytes: 148_000_000,
      languageSupport: "multilingual",
      filename: "ggml-base.bin",
      downloadURL: URL(string: "https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-base.bin")!
    ),
    .init(
      slug: "small",
      label: "Whisper Small (488 MB)",
      helper: "Recommended with GPU acceleration",
      sizeBytes: 488_000_000,
      languageSupport: "multilingual",
      filename: "ggml-small.bin",
      downloadURL: URL(string: "https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-small.bin")!
    ),
    .init(
      slug: "medium",
      label: "Whisper Medium (1.53 GB)",
      helper: "Balanced quality and speed",
      sizeBytes: 1_530_000_000,
      languageSupport: "multilingual",
      filename: "ggml-medium.bin",
      downloadURL: URL(string: "https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-medium.bin")!
    ),
    .init(
      slug: "large",
      label: "Whisper Large v3 (3.1 GB)",
      helper: "Highest accuracy, requires GPU",
      sizeBytes: 3_100_000_000,
      languageSupport: "multilingual",
      filename: "ggml-large-v3.bin",
      downloadURL: URL(string: "https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-large-v3.bin")!
    ),
    .init(
      slug: "turbo",
      label: "Whisper Large v3 Turbo (1.6 GB)",
      helper: "Fast large model, great accuracy",
      sizeBytes: 1_600_000_000,
      languageSupport: "multilingual",
      filename: "ggml-large-v3-turbo.bin",
      downloadURL: URL(string: "https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-large-v3-turbo.bin")!
    )
  ]

  private let fileManager: FileManager
  private let defaults: UserDefaults?
  private let appGroupId: String
  private let containerURL: URL?
  private let downloadHandler: DownloadHandler

  init(
    fileManager: FileManager = .default,
    defaults: UserDefaults? = UserDefaults(suiteName: DictationConstants.appGroupId),
    appGroupId: String = DictationConstants.appGroupId,
    containerURL: URL? = nil,
    downloadHandler: @escaping DownloadHandler = LocalTranscriptionModelManager.liveDownloadHandler
  ) {
    self.fileManager = fileManager
    self.defaults = defaults
    self.appGroupId = appGroupId
    self.containerURL = containerURL ?? fileManager.containerURL(
      forSecurityApplicationGroupIdentifier: appGroupId
    )
    self.downloadHandler = downloadHandler
  }

  func listModels() throws -> [Model] {
    let records = try refreshManifest()
    return Self.supportedModels.map { catalogEntry in
      let record = records[catalogEntry.slug] ?? defaultRecord(for: catalogEntry)
      return Model(
        slug: catalogEntry.slug,
        label: catalogEntry.label,
        helper: catalogEntry.helper,
        sizeBytes: catalogEntry.sizeBytes,
        languageSupport: catalogEntry.languageSupport,
        filename: catalogEntry.filename,
        downloadURL: catalogEntry.downloadURL,
        downloaded: record.downloaded,
        valid: record.valid,
        selected: record.selected,
        validationError: record.validationError
      )
    }
  }

  @discardableResult
  func downloadModel(slug: String) async throws -> Bool {
    let catalogEntry = try catalogEntry(for: slug)
    try ensureModelsDirectoryExists()

    let destinationURL = try modelFileURL(for: slug)
    if fileManager.fileExists(atPath: destinationURL.path) {
      try fileManager.removeItem(at: destinationURL)
    }

    try await downloadHandler(catalogEntry.downloadURL, destinationURL)

    guard try validateModel(slug: slug) else {
      throw ManagerError.invalidDownloadedArtifact(slug)
    }
    return true
  }

  @discardableResult
  func deleteModel(slug: String) throws -> Bool {
    guard Self.supportedModels.contains(where: { $0.slug == slug }) else {
      return false
    }

    let fileURL = try modelFileURL(for: slug)
    if fileManager.fileExists(atPath: fileURL.path) {
      try fileManager.removeItem(at: fileURL)
    }

    var records = try loadManifest()
    for index in records.indices {
      guard records[index].slug == slug else { continue }
      records[index].downloaded = false
      records[index].valid = false
      records[index].selected = false
      records[index].validationError = nil
    }
    try persistManifest(records)
    clearDefaultsSelectionIfNeeded(slug: slug)
    return true
  }

  @discardableResult
  func selectModel(slug: String) throws -> Bool {
    guard Self.supportedModels.contains(where: { $0.slug == slug }) else {
      return false
    }
    guard try validateModel(slug: slug) else {
      return false
    }

    var records = try loadManifest()
    for index in records.indices {
      records[index].selected = records[index].slug == slug
    }
    try persistManifest(records)
    return true
  }

  func clearSelection() throws {
    var records = try loadManifest()
    for index in records.indices {
      records[index].selected = false
    }
    try persistManifest(records)
  }

  @discardableResult
  func validateModel(slug: String) throws -> Bool {
    guard let catalogEntry = Self.supportedModels.first(where: { $0.slug == slug }) else {
      return false
    }

    var records = try loadManifest()
    var isValid = false
    for index in records.indices {
      guard records[index].slug == slug else { continue }
      let updated = try validatedRecord(for: catalogEntry, current: records[index])
      records[index] = updated
      isValid = updated.valid
    }
    try persistManifest(records)
    return isValid
  }

  func loadManifest() throws -> [LocalModelRecord] {
    guard let manifestURL = manifestURL else {
      throw ManagerError.appGroupUnavailable(appGroupId)
    }
    guard fileManager.fileExists(atPath: manifestURL.path) else {
      return defaultManifest()
    }

    do {
      let data = try Data(contentsOf: manifestURL)
      let decoded = try JSONDecoder().decode([LocalModelRecord].self, from: data)
      return normalize(records: decoded)
    } catch {
      return defaultManifest()
    }
  }

  func saveManifest(_ records: [LocalModelRecord]) throws {
    try persistManifest(records)
  }

  func modelFileURL(for slug: String) throws -> URL {
    let catalogEntry = try catalogEntry(for: slug)
    guard let modelsDirectoryURL else {
      throw ManagerError.appGroupUnavailable(appGroupId)
    }
    return modelsDirectoryURL.appendingPathComponent(catalogEntry.filename, isDirectory: false)
  }

  private var manifestURL: URL? {
    containerURL?.appendingPathComponent(
      DictationConstants.localTranscriptionManifestFileName,
      isDirectory: false
    )
  }

  private var modelsDirectoryURL: URL? {
    containerURL?.appendingPathComponent(
      DictationConstants.localTranscriptionModelsDirectoryName,
      isDirectory: true
    )
  }

  private func refreshManifest() throws -> [String: LocalModelRecord] {
    var records = try loadManifest()
    var changed = false

    for index in records.indices {
      let catalogEntry = try catalogEntry(for: records[index].slug)
      let updated = try validatedRecord(for: catalogEntry, current: records[index])
      changed = changed || updated != records[index]
      records[index] = updated
    }

    if changed {
      try persistManifest(records)
    }

    return Dictionary(uniqueKeysWithValues: records.map { ($0.slug, $0) })
  }

  private func validatedRecord(
    for catalogEntry: CatalogEntry,
    current: LocalModelRecord
  ) throws -> LocalModelRecord {
    let fileURL = try modelFileURL(for: catalogEntry.slug)
    var updated = LocalModelRecord(
      slug: catalogEntry.slug,
      filename: catalogEntry.filename,
      sizeBytes: catalogEntry.sizeBytes,
      languageSupport: catalogEntry.languageSupport,
      downloaded: current.downloaded,
      valid: current.valid,
      selected: current.selected,
      validationError: current.validationError
    )

    guard fileManager.fileExists(atPath: fileURL.path) else {
      updated.downloaded = false
      updated.valid = false
      updated.selected = false
      updated.validationError =
        current.downloaded || current.valid || current.selected || current.validationError != nil
        ? "Model file is missing."
        : nil
      clearDefaultsSelectionIfNeeded(slug: catalogEntry.slug)
      return updated
    }

    let values = try fileURL.resourceValues(forKeys: [.isRegularFileKey, .fileSizeKey])
    let fileSize = values.fileSize ?? 0
    let isRegularFile = values.isRegularFile ?? true

    if !isRegularFile {
      updated.downloaded = false
      updated.valid = false
      updated.selected = false
      updated.validationError = "Model path is not a file."
      clearDefaultsSelectionIfNeeded(slug: catalogEntry.slug)
      return updated
    }

    if fileSize <= 0 {
      updated.downloaded = false
      updated.valid = false
      updated.selected = false
      updated.validationError = "Model file is empty."
      clearDefaultsSelectionIfNeeded(slug: catalogEntry.slug)
      return updated
    }

    updated.downloaded = true
    updated.valid = true
    updated.validationError = nil
    return updated
  }

  private func persistManifest(_ records: [LocalModelRecord]) throws {
    try ensureModelsDirectoryExists()
    guard let manifestURL else {
      throw ManagerError.appGroupUnavailable(appGroupId)
    }

    let normalizedRecords = normalize(records: records)
    let encoder = JSONEncoder()
    encoder.outputFormatting = [.prettyPrinted, .sortedKeys]
    let data = try encoder.encode(normalizedRecords)
    try data.write(to: manifestURL, options: .atomic)
  }

  private func ensureModelsDirectoryExists() throws {
    guard let modelsDirectoryURL else {
      throw ManagerError.appGroupUnavailable(appGroupId)
    }
    try fileManager.createDirectory(at: modelsDirectoryURL, withIntermediateDirectories: true)
  }

  private func defaultManifest() -> [LocalModelRecord] {
    normalize(records: [])
  }

  private func defaultRecord(for catalogEntry: CatalogEntry) -> LocalModelRecord {
    LocalModelRecord(
      slug: catalogEntry.slug,
      filename: catalogEntry.filename,
      sizeBytes: catalogEntry.sizeBytes,
      languageSupport: catalogEntry.languageSupport,
      downloaded: false,
      valid: false,
      selected: false,
      validationError: nil
    )
  }

  private func normalize(records: [LocalModelRecord]) -> [LocalModelRecord] {
    let recordBySlug = Dictionary(uniqueKeysWithValues: records.map { ($0.slug, $0) })
    return Self.supportedModels.map { catalogEntry in
      let record = recordBySlug[catalogEntry.slug]
      return LocalModelRecord(
        slug: catalogEntry.slug,
        filename: catalogEntry.filename,
        sizeBytes: catalogEntry.sizeBytes,
        languageSupport: catalogEntry.languageSupport,
        downloaded: record?.downloaded ?? false,
        valid: record?.valid ?? false,
        selected: record?.selected ?? false,
        validationError: record?.validationError
      )
    }
  }

  private func catalogEntry(for slug: String) throws -> CatalogEntry {
    guard let catalogEntry = Self.supportedModels.first(where: { $0.slug == slug }) else {
      throw ManagerError.unsupportedModel(slug)
    }
    return catalogEntry
  }

  private func clearDefaultsSelectionIfNeeded(slug: String) {
    guard defaults?.string(forKey: Self.transcriptionModelKey) == slug else {
      return
    }
    defaults?.removeObject(forKey: Self.transcriptionModelKey)
  }
}
