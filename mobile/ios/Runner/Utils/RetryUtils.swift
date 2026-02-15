import Foundation

func withRetry<T>(
    maxAttempts: Int = 3,
    initialDelay: TimeInterval = 1.0,
    backoffMultiplier: Double = 2.0,
    operation: @escaping () async throws -> T
) async throws -> T {
    var lastError: Error?
    var delay = initialDelay

    for attempt in 1...maxAttempts {
        do {
            return try await operation()
        } catch {
            lastError = error
            NSLog("[VoquillApp] Retry %d/%d failed: %@", attempt, maxAttempts, error.localizedDescription)
            if attempt < maxAttempts {
                try await Task.sleep(nanoseconds: UInt64(delay * 1_000_000_000))
                delay *= backoffMultiplier
            }
        }
    }

    throw lastError!
}
