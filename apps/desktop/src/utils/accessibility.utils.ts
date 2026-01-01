import type { AccessibilityInfo } from "../types/accessibility.types";

export type TextFieldContext = {
  precedingText: string | null;
  selectedText: string | null;
  followingText: string | null;
};

export type ExtractContextOptions = {
  precedingCharLimit?: number;
  followingCharLimit?: number;
};

const DEFAULT_PRECEDING_CHAR_LIMIT = 200;
const DEFAULT_FOLLOWING_CHAR_LIMIT = 100;

export const extractPrecedingText = (
  info: AccessibilityInfo,
  charLimit: number,
): string | null => {
  if (info.textContent == null || info.cursorPosition == null) {
    return null;
  }

  if (charLimit <= 0) {
    return "";
  }

  const cursorPos = info.cursorPosition;
  if (cursorPos <= 0) {
    return null;
  }

  const fullPreceding = info.textContent.slice(0, cursorPos);
  if (fullPreceding.length === 0) {
    return null;
  }

  if (fullPreceding.length <= charLimit) {
    return fullPreceding;
  }

  return fullPreceding.slice(-charLimit);
};

export const extractSelectedText = (info: AccessibilityInfo): string | null => {
  if (
    info.textContent == null ||
    info.cursorPosition == null ||
    info.selectionLength == null ||
    info.selectionLength <= 0
  ) {
    return null;
  }

  const start = info.cursorPosition;
  const end = start + info.selectionLength;

  if (start < 0 || end > info.textContent.length) {
    return null;
  }

  const selected = info.textContent.slice(start, end);
  return selected.length > 0 ? selected : null;
};

export const extractFollowingText = (
  info: AccessibilityInfo,
  charLimit: number,
): string | null => {
  if (info.textContent == null || info.cursorPosition == null) {
    return null;
  }

  const selectionLen = info.selectionLength ?? 0;
  const afterPos = info.cursorPosition + selectionLen;

  if (afterPos >= info.textContent.length) {
    return null;
  }

  const fullFollowing = info.textContent.slice(afterPos);
  if (fullFollowing.length === 0) {
    return null;
  }

  if (fullFollowing.length <= charLimit) {
    return fullFollowing;
  }

  return fullFollowing.slice(0, charLimit);
};

export const extractTextFieldContext = (
  info: AccessibilityInfo | null,
  options?: ExtractContextOptions,
): TextFieldContext | null => {
  if (!info) {
    return null;
  }

  const precedingLimit =
    options?.precedingCharLimit ?? DEFAULT_PRECEDING_CHAR_LIMIT;
  const followingLimit =
    options?.followingCharLimit ?? DEFAULT_FOLLOWING_CHAR_LIMIT;

  const precedingText = extractPrecedingText(info, precedingLimit);
  const selectedText = extractSelectedText(info);
  const followingText = extractFollowingText(info, followingLimit);

  if (!precedingText && !selectedText && !followingText) {
    return null;
  }

  return {
    precedingText,
    selectedText,
    followingText,
  };
};

const isWhitespace = (char: string): boolean => {
  return char === " " || char === "\n" || char === "\t";
};

export const applySpacingInContext = (args: {
  textToInsert: string;
  info: AccessibilityInfo;
}): string => {
  const { textToInsert, info } = args;

  // If we can't determine context, return as-is
  if (info.textContent == null || info.cursorPosition == null) {
    return textToInsert;
  }

  // Empty text to insert, nothing to do
  if (textToInsert.length === 0) {
    return textToInsert;
  }

  let result = textToInsert;

  // Get the character immediately before cursor
  const cursorPos = info.cursorPosition;
  const charBefore = cursorPos > 0 ? info.textContent[cursorPos - 1] : null;

  // Get the character immediately after cursor (accounting for selection)
  const selectionLen = info.selectionLength ?? 0;
  const afterPos = cursorPos + selectionLen;
  const charAfter =
    afterPos < info.textContent.length ? info.textContent[afterPos] : null;

  // Add space before if there's non-whitespace content before
  // and the text to insert doesn't already start with whitespace
  const needsSpaceBefore =
    charBefore != null && !isWhitespace(charBefore) && !isWhitespace(result[0]);

  // Add space after if there's non-whitespace content after
  // and the text to insert doesn't already end with whitespace
  const needsSpaceAfter =
    charAfter != null &&
    !isWhitespace(charAfter) &&
    !isWhitespace(result[result.length - 1]);

  if (needsSpaceBefore) {
    result = " " + result;
  }

  if (needsSpaceAfter) {
    result = result + " ";
  }

  return result;
};
