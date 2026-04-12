import AVFoundation
import Foundation
import WhisperCpp

private struct WhisperCppSegment {
  let text: String
}

private enum WhisperCppRuntimeError: Error, LocalizedError {
  case failedToInitContext(String)
  case inferenceFailed(Int32)
  case audioDecodeFailed(String)

  var errorDescription: String? {
    switch self {
    case .failedToInitContext(let modelPath):
      return "Failed to load whisper.cpp model at \(modelPath)."
    case .inferenceFailed:
      return "whisper.cpp inference failed."
    case .audioDecodeFailed(let message):
      return message
    }
  }
}

private enum WhisperAudioDecoder {
  static func decodeToPCM16k(url: URL) throws -> [Float] {
    guard FileManager.default.fileExists(atPath: url.path) else {
      throw WhisperCppRuntimeError.audioDecodeFailed("Audio file not found: \(url.path)")
    }

    let file: AVAudioFile
    do {
      file = try AVAudioFile(forReading: url)
    } catch {
      throw WhisperCppRuntimeError.audioDecodeFailed(
        "Audio decode failed: \(error.localizedDescription)"
      )
    }

    let inputFormat = file.processingFormat
    guard let outputFormat = AVAudioFormat(
      commonFormat: .pcmFormatFloat32,
      sampleRate: 16_000,
      channels: 1,
      interleaved: false
    ) else {
      throw WhisperCppRuntimeError.audioDecodeFailed("Could not create 16k PCM format.")
    }

    guard let converter = AVAudioConverter(from: inputFormat, to: outputFormat) else {
      throw WhisperCppRuntimeError.audioDecodeFailed("Could not create audio converter.")
    }

    let inputCapacity = AVAudioFrameCount(file.length)
    guard let inputBuffer = AVAudioPCMBuffer(
      pcmFormat: inputFormat,
      frameCapacity: inputCapacity
    ) else {
      throw WhisperCppRuntimeError.audioDecodeFailed("Could not allocate audio buffer.")
    }
    try file.read(into: inputBuffer)

    let ratio = outputFormat.sampleRate / inputFormat.sampleRate
    let outputCapacity = AVAudioFrameCount(Double(inputBuffer.frameLength) * ratio + 1024)
    guard let outputBuffer = AVAudioPCMBuffer(
      pcmFormat: outputFormat,
      frameCapacity: outputCapacity
    ) else {
      throw WhisperCppRuntimeError.audioDecodeFailed("Could not allocate converted buffer.")
    }

    var suppliedInput = false
    let inputBlock: AVAudioConverterInputBlock = { _, outStatus in
      if suppliedInput {
        outStatus.pointee = .endOfStream
        return nil
      }
      suppliedInput = true
      outStatus.pointee = .haveData
      return inputBuffer
    }

    var conversionError: NSError?
    converter.convert(to: outputBuffer, error: &conversionError, withInputFrom: inputBlock)
    if let conversionError {
      throw WhisperCppRuntimeError.audioDecodeFailed(
        "Audio conversion failed: \(conversionError.localizedDescription)"
      )
    }

    guard let channel = outputBuffer.floatChannelData?[0] else {
      throw WhisperCppRuntimeError.audioDecodeFailed("No decoded audio channel was produced.")
    }

    return Array(UnsafeBufferPointer(start: channel, count: Int(outputBuffer.frameLength)))
  }
}

private final class WhisperCppContext {
  private let context: OpaquePointer

  init(modelPath: String) throws {
    var params = whisper_context_default_params()
    params.use_gpu = true
    params.flash_attn = true
    params.gpu_device = 0

    guard let context = whisper_init_from_file_with_params(modelPath, params) else {
      throw WhisperCppRuntimeError.failedToInitContext(modelPath)
    }

    self.context = context
  }

  deinit {
    whisper_free(context)
  }

  func transcribe(
    pcm16k: [Float],
    prompt: String?,
    language: String?,
    threads: Int32
  ) throws -> [WhisperCppSegment] {
    var params = whisper_full_default_params(WHISPER_SAMPLING_GREEDY)
    params.print_progress = false
    params.print_realtime = false
    params.print_timestamps = false
    params.print_special = false
    params.translate = false
    params.n_threads = max(1, threads)

    let normalizedPrompt = prompt?.trimmingCharacters(in: .whitespacesAndNewlines)
    let promptToUse = (normalizedPrompt?.isEmpty == false) ? normalizedPrompt : nil
    let normalizedLanguage = language?.trimmingCharacters(in: .whitespacesAndNewlines)
    let languageToUse = (normalizedLanguage?.isEmpty == false) ? normalizedLanguage : nil

    let code: Int32
    if let promptToUse {
      code = promptToUse.withCString { promptCString in
        var promptParams = params
        promptParams.initial_prompt = promptCString

        if let languageToUse {
          return languageToUse.withCString { languageCString in
            var localParams = promptParams
            localParams.language = languageCString
            return whisper_full(context, localParams, pcm16k, Int32(pcm16k.count))
          }
        }

        return whisper_full(context, promptParams, pcm16k, Int32(pcm16k.count))
      }
    } else if let languageToUse {
      code = languageToUse.withCString { languageCString in
        var localParams = params
        localParams.language = languageCString
        return whisper_full(context, localParams, pcm16k, Int32(pcm16k.count))
      }
    } else {
      code = whisper_full(context, params, pcm16k, Int32(pcm16k.count))
    }

    guard code == 0 else {
      throw WhisperCppRuntimeError.inferenceFailed(code)
    }

    let segmentCount = Int(whisper_full_n_segments(context))
    return (0..<segmentCount).map { index in
      let textPointer = whisper_full_get_segment_text(context, Int32(index))
      let text = textPointer.map { String(cString: $0) } ?? ""
      return WhisperCppSegment(text: text)
    }
  }
}

final class LocalTranscribeAudioRepo: BaseTranscribeAudioRepo {
  enum LocalTranscribeAudioRepoError: Error, LocalizedError {
    case unavailableModel(String)
    case transcriptionFailed(String)

    var errorDescription: String? {
      switch self {
      case .unavailableModel:
        return "Selected local model is missing or invalid. Open Voquill to re-download it."
      case .transcriptionFailed:
        return "Local transcription failed — try again."
      }
    }
  }

  private let modelURL: URL

  init(
    modelSlug: String,
    modelManager: LocalTranscriptionModelManager = LocalTranscriptionModelManager()
  ) throws {
    guard try modelManager.validateModel(slug: modelSlug) else {
      throw LocalTranscribeAudioRepoError.unavailableModel(modelSlug)
    }

    self.modelURL = try modelManager.modelFileURL(for: modelSlug)
  }

  override func transcribe(audioFileURL: URL, prompt: String? = nil, language: String? = nil) async throws -> String {
    guard FileManager.default.fileExists(atPath: audioFileURL.path) else {
      throw TranscribeError.noAudioData
    }

    let modelURL = self.modelURL
    return try await Task.detached(priority: .userInitiated) {
      let context = try WhisperCppContext(modelPath: modelURL.path)
      let pcm16k = try WhisperAudioDecoder.decodeToPCM16k(url: audioFileURL)
      let normalizedLanguage = language?.trimmingCharacters(in: .whitespacesAndNewlines)
      let segments = try context.transcribe(
        pcm16k: pcm16k,
        prompt: prompt,
        language: (normalizedLanguage?.isEmpty == false && normalizedLanguage != "auto") ? normalizedLanguage : nil,
        threads: Int32(ProcessInfo.processInfo.activeProcessorCount - 1)
      )

      return segments.map(\.text).joined().trimmingCharacters(in: .whitespacesAndNewlines)
    }.value
  }
}
