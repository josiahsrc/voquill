import { DictionaryEntries } from "./prompt.utils";

/**
 * Normalizes a word by removing punctuation and converting to lowercase.
 * This allows matching words regardless of case and surrounding punctuation.
 */
export const normalizeWord = (word: string): string => {
  return word.toLowerCase().replace(/[^\p{L}\p{N}]/gu, ""); // Remove all non-letter/non-number characters
};

/**
 * Applies replacement rules to a transcript using search and replace.
 * For each word in the transcript, checks if its normalized form matches
 * any replacement rule key (case-insensitive, punctuation-removed).
 * If matched, replaces ONLY that word with the destination value, preserving
 * all other parts of the transcript including punctuation and spacing.
 */
export const applyReplacementRules = (
  transcript: string,
  dictionaryEntries: DictionaryEntries,
): string => {
  if (dictionaryEntries.replacements.length === 0) {
    return transcript;
  }

  // Build a map of normalized source -> destination for O(1) lookup
  const replacementMap = new Map<string, string>();
  for (const rule of dictionaryEntries.replacements) {
    const normalizedSource = normalizeWord(rule.source);
    replacementMap.set(normalizedSource, rule.destination);
  }

  // Split transcript into tokens, preserving all whitespace and punctuation
  // This regex splits on word boundaries while capturing both words and separators
  const tokens: string[] = [];
  let lastIndex = 0;

  // Match sequences of letters/numbers (words)
  const wordRegex = /[\p{L}\p{N}]+/gu;
  let match;

  while ((match = wordRegex.exec(transcript)) !== null) {
    // Add any text before this word (whitespace, punctuation, etc.)
    if (match.index > lastIndex) {
      tokens.push(transcript.substring(lastIndex, match.index));
    }

    // Add the word itself
    const word = match[0];
    const normalizedWord = normalizeWord(word);
    const replacement = replacementMap.get(normalizedWord);

    tokens.push(replacement ?? word);
    lastIndex = match.index + word.length;
  }

  // Add any remaining text after the last word
  if (lastIndex < transcript.length) {
    tokens.push(transcript.substring(lastIndex));
  }

  return tokens.join("");
};
