import Foundation

enum TranscriptionBackend: Equatable {
  case cloud
  case api
  case local(model: String)
}

enum TranscriptionBackendResolverError: Error, LocalizedError, Equatable {
  case missingCloudConfiguration
  case missingApiConfiguration
  case missingLocalModelSelection
  case invalidLocalModel(String)

  var errorDescription: String? {
    switch self {
    case .missingCloudConfiguration:
      return "Cloud transcription is not configured."
    case .missingApiConfiguration:
      return "API transcription is not configured."
    case .missingLocalModelSelection:
      return "Local transcription needs a downloaded model. Open Voquill to choose one."
    case .invalidLocalModel:
      return "Selected local model is missing or invalid. Open Voquill to re-download it."
    }
  }
}

struct TranscriptionBackendResolver {
  func resolve(
    transcriptionMode: String?,
    selectedModel: String?,
    hasCloudConfig: Bool,
    hasApiConfig: Bool,
    localModelValid: Bool
  ) throws -> TranscriptionBackend {
    switch transcriptionMode ?? "cloud" {
    case "local":
      guard let model = selectedModel?.trimmingCharacters(in: .whitespacesAndNewlines),
            !model.isEmpty else {
        throw TranscriptionBackendResolverError.missingLocalModelSelection
      }
      guard localModelValid else {
        throw TranscriptionBackendResolverError.invalidLocalModel(model)
      }
      return .local(model: model)
    case "api":
      if hasApiConfig {
        return .api
      }
      throw TranscriptionBackendResolverError.missingApiConfiguration
    default:
      guard hasCloudConfig else {
        throw TranscriptionBackendResolverError.missingCloudConfiguration
      }
      return .cloud
    }
  }
}
