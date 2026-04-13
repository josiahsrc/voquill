import XCTest
@testable import Runner

final class TranscriptionBackendResolverTests: XCTestCase {
  func testResolverUsesLocalRepoWhenModeIsLocalAndModelIsValid() throws {
    let resolver = TranscriptionBackendResolver()

    let result = try resolver.resolve(
      transcriptionMode: "local",
      selectedModel: "tiny",
      hasCloudConfig: false,
      hasApiConfig: false,
      localModelValid: true
    )

    XCTAssertEqual(result, .local(model: "tiny"))
  }

  func testResolverDoesNotFallBackToCloudWhenLocalModelIsInvalid() {
    let resolver = TranscriptionBackendResolver()

    XCTAssertThrowsError(
      try resolver.resolve(
        transcriptionMode: "local",
        selectedModel: "tiny",
        hasCloudConfig: true,
        hasApiConfig: false,
        localModelValid: false
      )
    ) { error in
      XCTAssertEqual(
        error as? TranscriptionBackendResolverError,
        .invalidLocalModel("tiny")
      )
    }
  }

  func testResolverRejectsApiModeWhenApiConfigIsMissingEvenIfCloudExists() {
    let resolver = TranscriptionBackendResolver()

    XCTAssertThrowsError(
      try resolver.resolve(
        transcriptionMode: "api",
        selectedModel: nil,
        hasCloudConfig: true,
        hasApiConfig: false,
        localModelValid: false
      )
    ) { error in
      XCTAssertEqual(
        error as? TranscriptionBackendResolverError,
        .missingApiConfiguration
      )
    }
  }

  func testResolverDefaultsNilModeToCloudOnly() throws {
    let resolver = TranscriptionBackendResolver()

    let result = try resolver.resolve(
      transcriptionMode: nil,
      selectedModel: nil,
      hasCloudConfig: true,
      hasApiConfig: false,
      localModelValid: false
    )

    XCTAssertEqual(result, .cloud)
  }

  func testResolverRejectsUnknownMode() {
    let resolver = TranscriptionBackendResolver()

    XCTAssertThrowsError(
      try resolver.resolve(
        transcriptionMode: "unexpected-mode",
        selectedModel: nil,
        hasCloudConfig: true,
        hasApiConfig: false,
        localModelValid: false
      )
    ) { error in
      XCTAssertEqual(
        error as? TranscriptionBackendResolverError,
        .invalidTranscriptionMode("unexpected-mode")
      )
    }
  }
}
