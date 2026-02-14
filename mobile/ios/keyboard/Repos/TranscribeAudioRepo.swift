import AVFoundation
import Foundation

class BaseTranscribeAudioRepo {
    func segmentDurationSec() -> TimeInterval { 60 }
    func overlapDurationSec() -> TimeInterval { 5 }
    func batchChunkCount() -> Int { 3 }

    func transcribeSegment(audioData: Data) async throws -> String {
        fatalError("Subclasses must override transcribeSegment")
    }

    func transcribe(audioFileURL: URL) async throws -> String {
        guard let audioData = try? Data(contentsOf: audioFileURL), !audioData.isEmpty else {
            throw TranscribeError.noAudioData
        }

        let asset = AVURLAsset(url: audioFileURL)
        let totalSeconds = CMTimeGetSeconds(asset.duration)

        if totalSeconds <= segmentDurationSec() {
            return try await withRetry {
                try await self.transcribeSegment(audioData: audioData)
            }
        }

        let segments = try await splitIntoSegments(asset: asset, totalDuration: totalSeconds)
        var allResults: [String] = []
        let chunkCount = batchChunkCount()

        for batchStart in stride(from: 0, to: segments.count, by: chunkCount) {
            let batchEnd = min(batchStart + chunkCount, segments.count)
            let batch = Array(segments[batchStart..<batchEnd])

            let batchResults = try await withThrowingTaskGroup(of: (Int, String).self) { group in
                for (i, segmentData) in batch.enumerated() {
                    group.addTask {
                        let text = try await withRetry {
                            try await self.transcribeSegment(audioData: segmentData)
                        }
                        return (i, text)
                    }
                }

                var results = [(Int, String)]()
                for try await result in group {
                    results.append(result)
                }
                return results.sorted { $0.0 < $1.0 }.map(\.1)
            }

            allResults.append(contentsOf: batchResults)
        }

        return mergeTranscriptions(allResults)
    }

    // MARK: - Audio Splitting

    private func splitIntoSegments(asset: AVURLAsset, totalDuration: TimeInterval) async throws -> [Data] {
        let step = segmentDurationSec() - overlapDurationSec()
        var segments: [Data] = []
        var start: TimeInterval = 0

        while start < totalDuration {
            let end = min(start + segmentDurationSec(), totalDuration)
            let data = try await exportSegment(asset: asset, from: start, to: end)
            segments.append(data)
            if end >= totalDuration { break }
            start += step
        }

        return segments
    }

    private func exportSegment(asset: AVAsset, from startTime: TimeInterval, to endTime: TimeInterval) async throws -> Data {
        guard let session = AVAssetExportSession(asset: asset, presetName: AVAssetExportPresetAppleM4A) else {
            throw TranscribeError.exportFailed("Could not create export session")
        }

        let outputURL = FileManager.default.temporaryDirectory
            .appendingPathComponent("voquill_seg_\(UUID().uuidString).m4a")
        try? FileManager.default.removeItem(at: outputURL)

        session.outputURL = outputURL
        session.outputFileType = .m4a
        session.timeRange = CMTimeRange(
            start: CMTime(seconds: startTime, preferredTimescale: 44100),
            end: CMTime(seconds: endTime, preferredTimescale: 44100)
        )

        try await withCheckedThrowingContinuation { (continuation: CheckedContinuation<Void, Error>) in
            session.exportAsynchronously {
                if session.status == .completed {
                    continuation.resume()
                } else {
                    continuation.resume(throwing: TranscribeError.exportFailed(
                        session.error?.localizedDescription ?? "Unknown export error"
                    ))
                }
            }
        }

        let data = try Data(contentsOf: outputURL)
        try? FileManager.default.removeItem(at: outputURL)
        return data
    }

    // MARK: - Merge

    private func mergeTranscriptions(_ transcriptions: [String]) -> String {
        guard !transcriptions.isEmpty else { return "" }
        guard transcriptions.count > 1 else { return transcriptions[0] }
        return transcriptions.reduce("") { merged, current in
            mergeTwoTranscriptions(first: merged, second: current)
        }
    }

    private func mergeTwoTranscriptions(first: String, second: String) -> String {
        let a = first.trimmingCharacters(in: .whitespacesAndNewlines)
        let b = second.trimmingCharacters(in: .whitespacesAndNewlines)
        if a.isEmpty { return b }
        if b.isEmpty { return a }

        let aWords = a.split(separator: " ").map(String.init)
        let bWords = b.split(separator: " ").map(String.init)
        let maxCheck = min(aWords.count, bWords.count, 20)

        for size in stride(from: maxCheck, through: 1, by: -1) {
            let endA = aWords.suffix(size).map { $0.lowercased() }
            let startB = bWords.prefix(size).map { $0.lowercased() }
            if endA == startB {
                let kept = aWords.joined(separator: " ")
                let rest = bWords.dropFirst(size).joined(separator: " ")
                return rest.isEmpty ? kept : "\(kept) \(rest)"
            }
        }

        return "\(a) \(b)"
    }
}

// MARK: - Cloud Implementation

class CloudTranscribeAudioRepo: BaseTranscribeAudioRepo {
    private let config: RepoConfig

    init(config: RepoConfig) {
        self.config = config
    }

    override func transcribeSegment(audioData: Data) async throws -> String {
        let result = try await invokeHandler(
            config: config,
            name: "ai/transcribeAudio",
            args: [
                "audioBase64": audioData.base64EncodedString(),
                "audioMimeType": "audio/mp4",
            ]
        )
        guard let text = result["text"] as? String else {
            throw ApiError.parseError
        }
        return text
    }
}

// MARK: - Errors

enum TranscribeError: Error, LocalizedError {
    case noAudioData
    case exportFailed(String)

    var errorDescription: String? {
        switch self {
        case .noAudioData: return "No audio data found"
        case .exportFailed(let msg): return "Audio export failed: \(msg)"
        }
    }
}
