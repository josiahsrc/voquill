/**
 * Normalizes a word for comparison by removing punctuation and lowercasing.
 * This helps match words like "eat" and "eat," or "Hello" and "hello".
 */
const normalizeForComparison = (word: string): string => {
  return word.replace(/[.,!?;:'"()[\]{}]/g, "").toLowerCase();
};

/**
 * Finds the longest overlap between the end of `firstWords` and the start of `secondWords`.
 * Returns the number of overlapping words.
 *
 * Example: ["I", "want", "to", "eat"] and ["to", "eat", "milk"] → 2 (overlap is "to eat")
 */
const findOverlapLength = (
  firstWords: string[],
  secondWords: string[],
): number => {
  const maxPossibleOverlap = Math.min(firstWords.length, secondWords.length);

  for (let len = maxPossibleOverlap; len > 0; len--) {
    const endOfFirst = firstWords.slice(-len);
    const startOfSecond = secondWords.slice(0, len);

    const matches = endOfFirst.every(
      (word, i) =>
        normalizeForComparison(word) ===
        normalizeForComparison(startOfSecond[i]),
    );

    if (matches) {
      return len;
    }
  }

  return 0;
};

/**
 * Merges two transcriptions by finding word overlap and combining them.
 * If overlap is found, the overlapping portion is not duplicated.
 * If no overlap, the strings are concatenated with a space.
 */
const mergeTwoTranscriptions = (first: string, second: string): string => {
  const trimmedFirst = first.trim();
  const trimmedSecond = second.trim();

  if (!trimmedFirst) return trimmedSecond;
  if (!trimmedSecond) return trimmedFirst;

  const firstWords = trimmedFirst.split(/\s+/);
  const secondWords = trimmedSecond.split(/\s+/);

  const overlapLength = findOverlapLength(firstWords, secondWords);

  if (overlapLength === 0) {
    // No overlap found, simple concatenation
    return `${trimmedFirst} ${trimmedSecond}`;
  }

  // Merge: keep first transcription and append non-overlapping part of second
  const nonOverlappingSecond = secondWords.slice(overlapLength).join(" ");

  if (!nonOverlappingSecond) {
    // Second is fully contained in the overlap
    return trimmedFirst;
  }

  return `${trimmedFirst} ${nonOverlappingSecond}`;
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
