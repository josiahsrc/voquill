import { Nullable } from "@repo/types";

/**
 * Calculates the Levenshtein edit distance between two strings.
 * Returns the minimum number of single-character edits (insertions,
 * deletions, or substitutions) required to change one string into the other.
 */
export const editDistance = (a: string, b: string): number => {
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;

  // Use two rows instead of full matrix for space efficiency
  let prevRow = Array.from({ length: b.length + 1 }, (_, i) => i);
  // oxlint-disable-next-line no-new-array
  let currRow = new Array<number>(b.length + 1);

  for (let i = 1; i <= a.length; i++) {
    currRow[0] = i;

    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      currRow[j] = Math.min(
        currRow[j - 1]! + 1, // insertion
        prevRow[j]! + 1, // deletion
        prevRow[j - 1]! + cost, // substitution
      );
    }

    [prevRow, currRow] = [currRow, prevRow];
  }

  return prevRow[b.length]!;
};

/**
 * Calculates the similarity between two strings as a ratio from 0 to 1.
 * Returns 1 for identical strings, 0 for completely different strings.
 * Based on Levenshtein edit distance.
 */
export const getStringSimilarity = (a: string, b: string): number => {
  if (a.length === 0 && b.length === 0) return 1;

  const maxLength = Math.max(a.length, b.length);
  const distance = editDistance(a, b);

  return (maxLength - distance) / maxLength;
};

export const getFirstAndLastName = (
  fullName: string,
): {
  firstName: Nullable<string>;
  lastName: Nullable<string>;
} => {
  const parts = fullName.trim().split(/\s+/);
  if (parts.length === 0) {
    return { firstName: null, lastName: null };
  }

  const firstName = parts[0];
  const lastName = parts.length > 1 ? parts.at(-1) : null;
  return {
    firstName: firstName.trim() || null,
    lastName: lastName?.trim() || null,
  };
};

export const getInitials = (fullName: string): string => {
  const { firstName, lastName } = getFirstAndLastName(fullName);
  if (!firstName && !lastName) return "";
  if (firstName && !lastName) return firstName.charAt(0).toUpperCase();
  if (!firstName && lastName) return lastName.charAt(0).toUpperCase();
  return (
    (firstName ? firstName.charAt(0).toUpperCase() : "") +
    (lastName ? lastName.charAt(0).toUpperCase() : "")
  );
};
