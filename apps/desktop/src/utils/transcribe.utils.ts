/**
 * Normalizes a word for comparison by removing punctuation and lowercasing.
 * This helps match words like "eat" and "eat," or "Hello" and "hello".
 */
const normalizeForComparison = (word: string): string => {
  return word.replace(/[.,!?;:'"()[\]{}]/g, "").toLowerCase();
};

type OverlapResult = {
  overlapLength: number;
  dropLastWordOfFirst: boolean;
};

/**
 * Finds the longest overlap between the end of `firstWords` and the start of `secondWords`.
 * Returns the overlap length and whether the last word of first should be dropped (truncated word case).
 *
 * Example: ["I", "want", "to", "eat"] and ["to", "eat", "milk"] → { overlapLength: 2, dropLastWordOfFirst: false }
 *
 * Truncated word case:
 * ["hello", "i", "like", "big"] and ["like", "bagels", "a", "lot"]
 * → { overlapLength: 1, dropLastWordOfFirst: true }
 * Here "big" is a misheard truncated word, and "like" is the actual overlap point.
 */
const findOverlapInfo = (
  firstWords: string[],
  secondWords: string[],
): OverlapResult => {
  const maxPossibleOverlap = Math.min(firstWords.length, secondWords.length);

  // Try exact match first (original behavior)
  for (let len = maxPossibleOverlap; len > 0; len--) {
    const endOfFirst = firstWords.slice(-len);
    const startOfSecond = secondWords.slice(0, len);

    const matches = endOfFirst.every(
      (word, i) =>
        normalizeForComparison(word) ===
        normalizeForComparison(startOfSecond[i]),
    );

    if (matches) {
      return { overlapLength: len, dropLastWordOfFirst: false };
    }
  }

  // Try truncated last word match
  // Check if first[-(len+1):-1] matches second[0:len]
  // This handles the case where audio was cut mid-word and the transcriber
  // misheard the partial word (e.g., "bagels" cut mid-word → "big")
  if (firstWords.length >= 2) {
    for (
      let len = Math.min(maxPossibleOverlap, secondWords.length);
      len >= 1;
      len--
    ) {
      // Need at least len+1 words in first to have len overlap + 1 truncated word
      if (firstWords.length < len + 1) continue;

      // Get len words from first, excluding the very last word (which might be truncated)
      const endOfFirst = firstWords.slice(-(len + 1), -1);
      const startOfSecond = secondWords.slice(0, len);

      const matches = endOfFirst.every(
        (word, i) =>
          normalizeForComparison(word) ===
          normalizeForComparison(startOfSecond[i]),
      );

      if (matches) {
        return { overlapLength: len, dropLastWordOfFirst: true };
      }
    }
  }

  // Try prefix match for the very last word
  // Check if first's last word is a truncated prefix of second's first word
  // e.g., "hello wor" + "world peace" → "wor" is prefix of "world"
  if (firstWords.length >= 1 && secondWords.length >= 1) {
    const lastWordOfFirst = normalizeForComparison(
      firstWords[firstWords.length - 1],
    );
    const firstWordOfSecond = normalizeForComparison(secondWords[0]);

    // Check if last word of first is a prefix of first word of second
    // and is shorter (to avoid matching identical words)
    if (
      firstWordOfSecond.startsWith(lastWordOfFirst) &&
      lastWordOfFirst.length < firstWordOfSecond.length
    ) {
      return { overlapLength: 0, dropLastWordOfFirst: true };
    }
  }

  return { overlapLength: 0, dropLastWordOfFirst: false };
};

/**
 * Merges two transcriptions by finding word overlap and combining them.
 * If overlap is found, the overlapping portion is not duplicated.
 * If no overlap, the strings are concatenated with a space.
 *
 * Also handles the case where the last word of the first transcription was
 * truncated/misheard due to audio being cut mid-word. In this case, the
 * truncated word is dropped and replaced with the correct word from the
 * second transcription.
 */
const mergeTwoTranscriptions = (first: string, second: string): string => {
  const trimmedFirst = first.trim();
  const trimmedSecond = second.trim();

  if (!trimmedFirst) return trimmedSecond;
  if (!trimmedSecond) return trimmedFirst;

  const firstWords = trimmedFirst.split(/\s+/);
  const secondWords = trimmedSecond.split(/\s+/);

  const { overlapLength, dropLastWordOfFirst } = findOverlapInfo(
    firstWords,
    secondWords,
  );

  if (overlapLength === 0 && !dropLastWordOfFirst) {
    // No overlap found, simple concatenation
    return `${trimmedFirst} ${trimmedSecond}`;
  }

  if (overlapLength === 0 && dropLastWordOfFirst) {
    // Last word of first is a truncated prefix of first word of second
    // Drop the truncated word and concatenate with second
    const firstPart = firstWords.slice(0, -1).join(" ");
    if (!firstPart) return trimmedSecond;
    return `${firstPart} ${trimmedSecond}`;
  }

  // Determine the first part of the merged result
  let firstPart: string;
  if (dropLastWordOfFirst) {
    // Drop the truncated/misheard last word from first
    firstPart = firstWords.slice(0, -1).join(" ");
  } else {
    firstPart = trimmedFirst;
  }

  // Get the non-overlapping part of second
  const nonOverlappingSecond = secondWords.slice(overlapLength).join(" ");

  // Handle edge cases
  if (!firstPart) {
    // First part became empty after dropping truncated word
    return trimmedSecond;
  }

  if (!nonOverlappingSecond) {
    // Second is fully contained in the overlap
    if (dropLastWordOfFirst) {
      // Include the overlap words from second since we dropped first's truncated word
      return `${firstPart} ${secondWords.slice(0, overlapLength).join(" ")}`;
    }
    return firstPart;
  }

  // Standard merge: first part + non-overlapping second
  return `${firstPart} ${nonOverlappingSecond}`;
};

/**
 * Merges multiple transcriptions from overlapping audio segments into a single string.
 *
 * The algorithm detects word overlap between consecutive transcriptions:
 * - If the end of one transcription matches the start of the next, they're merged at that point
 * - If no overlap is detected, transcriptions are concatenated with a space
 *
 * @example
 * // With overlap
 * mergeTranscriptions(["I want to eat", "to eat milk and cookies"])
 * // Returns: "I want to eat milk and cookies"
 *
 * @example
 * // Without overlap
 * mergeTranscriptions(["I want to", "eat milk"])
 * // Returns: "I want to eat milk"
 */
export const mergeTranscriptions = (transcriptions: string[]): string => {
  if (transcriptions.length === 0) return "";
  if (transcriptions.length === 1) return transcriptions[0];

  return transcriptions.reduce((merged, current) =>
    mergeTwoTranscriptions(merged, current),
  );
};

/**
 * Splits audio samples into overlapping segments for transcription.
 *
 * @example
 * // With 4 second segments and 2 second overlap:
 * // Segment 1: 0-4 sec
 * // Segment 2: 2-6 sec
 * // Segment 3: 4-8 sec
 * // etc.
 */
export const splitAudioTranscription = (args: {
  sampleRate: number;
  samples: Float32Array;
  segmentDurationSec: number;
  overlapDurationSec: number;
}): Float32Array[] => {
  const { sampleRate, samples, segmentDurationSec, overlapDurationSec } = args;

  const segmentSamples = Math.floor(sampleRate * segmentDurationSec);
  const stepSamples = Math.floor(sampleRate * (segmentDurationSec - overlapDurationSec));

  if (stepSamples <= 0) {
    throw new Error("Overlap duration must be less than segment duration");
  }

  if (samples.length <= segmentSamples) {
    return [samples];
  }

  const segments: Float32Array[] = [];

  for (let start = 0; start < samples.length; start += stepSamples) {
    const end = Math.min(start + segmentSamples, samples.length);
    segments.push(samples.slice(start, end));

    if (end === samples.length) {
      break;
    }
  }

  return segments;
}
