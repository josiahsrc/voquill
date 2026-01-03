import { describe, expect, it } from "vitest";
import {
  editDistance,
  getFirstAndLastName,
  getInitials,
  getStringSimilarity,
} from "./string.utils";

describe("editDistance", () => {
  it("should return 0 for identical strings", () => {
    expect(editDistance("hello", "hello")).toBe(0);
    expect(editDistance("", "")).toBe(0);
  });

  it("should return length of other string when one is empty", () => {
    expect(editDistance("", "hello")).toBe(5);
    expect(editDistance("hello", "")).toBe(5);
  });

  it("should return 1 for single character difference", () => {
    expect(editDistance("cat", "bat")).toBe(1); // substitution
    expect(editDistance("cat", "cats")).toBe(1); // insertion
    expect(editDistance("cats", "cat")).toBe(1); // deletion
  });

  it("should handle insertions", () => {
    expect(editDistance("ac", "abc")).toBe(1);
    expect(editDistance("abc", "abcd")).toBe(1);
  });

  it("should handle deletions", () => {
    expect(editDistance("abc", "ac")).toBe(1);
    expect(editDistance("abcd", "abc")).toBe(1);
  });

  it("should handle substitutions", () => {
    expect(editDistance("abc", "adc")).toBe(1);
    expect(editDistance("abc", "axc")).toBe(1);
  });

  it("should handle multiple edits", () => {
    expect(editDistance("kitten", "sitting")).toBe(3);
    expect(editDistance("saturday", "sunday")).toBe(3);
  });

  it("should handle completely different strings", () => {
    expect(editDistance("abc", "xyz")).toBe(3);
    expect(editDistance("hello", "world")).toBe(4);
  });

  it("should be symmetric", () => {
    expect(editDistance("abc", "def")).toBe(editDistance("def", "abc"));
    expect(editDistance("kitten", "sitting")).toBe(
      editDistance("sitting", "kitten"),
    );
  });

  it("should handle case sensitivity", () => {
    expect(editDistance("Hello", "hello")).toBe(1);
    expect(editDistance("ABC", "abc")).toBe(3);
  });

  it("should handle whitespace differences", () => {
    expect(editDistance("slow moving", "slowmoving")).toBe(1);
    expect(editDistance("hello world", "helloworld")).toBe(1);
  });
});

describe("getStringSimilarity", () => {
  it("should return 1 for identical strings", () => {
    expect(getStringSimilarity("hello", "hello")).toBe(1);
    expect(getStringSimilarity("test", "test")).toBe(1);
  });

  it("should return 1 for two empty strings", () => {
    expect(getStringSimilarity("", "")).toBe(1);
  });

  it("should return 0 when one string is empty and other is not", () => {
    expect(getStringSimilarity("", "hello")).toBe(0);
    expect(getStringSimilarity("hello", "")).toBe(0);
  });

  it("should return correct similarity for single character difference", () => {
    // "hello" vs "hallo" = 1 edit, 5 chars max, similarity = 4/5 = 0.8
    expect(getStringSimilarity("hello", "hallo")).toBe(0.8);
  });

  it("should return correct similarity for multiple differences", () => {
    // "kitten" vs "sitting" = 3 edits, 7 chars max, similarity = 4/7
    expect(getStringSimilarity("kitten", "sitting")).toBeCloseTo(4 / 7);
  });

  it("should return 0 for completely different strings of same length", () => {
    expect(getStringSimilarity("abc", "xyz")).toBe(0);
  });

  it("should be symmetric", () => {
    expect(getStringSimilarity("abc", "def")).toBe(
      getStringSimilarity("def", "abc"),
    );
    expect(getStringSimilarity("hello", "world")).toBe(
      getStringSimilarity("world", "hello"),
    );
  });

  it("should handle high similarity strings", () => {
    // "slow moving" vs "slowmoving" = 1 edit, 11 chars max, similarity = 10/11
    const similarity = getStringSimilarity("slow moving", "slowmoving");
    expect(similarity).toBeCloseTo(10 / 11);
    expect(similarity).toBeGreaterThan(0.9);
  });

  it("should return value between 0 and 1", () => {
    const testCases = [
      ["a", "b"],
      ["hello", "world"],
      ["test", "testing"],
      ["abc", "abcdef"],
    ];

    for (const [a, b] of testCases) {
      const similarity = getStringSimilarity(a, b);
      expect(similarity).toBeGreaterThanOrEqual(0);
      expect(similarity).toBeLessThanOrEqual(1);
    }
  });
});

describe("getFirstAndLastName", () => {
  it("should return first and last name for a full name", () => {
    const result = getFirstAndLastName("John Doe");
    expect(result).toEqual({ firstName: "John", lastName: "Doe" });
  });

  it("should return only first name if no last name", () => {
    const result = getFirstAndLastName("John");
    expect(result).toEqual({ firstName: "John", lastName: null });
  });

  it("should handle names with multiple parts", () => {
    const result = getFirstAndLastName("John Michael Doe");
    expect(result).toEqual({ firstName: "John", lastName: "Doe" });
  });

  it("should handle leading and trailing spaces", () => {
    const result = getFirstAndLastName("  John Doe  ");
    expect(result).toEqual({ firstName: "John", lastName: "Doe" });
  });

  it("should return nulls for empty string", () => {
    const result = getFirstAndLastName("");
    expect(result).toEqual({ firstName: null, lastName: null });
  });

  it("should return nulls for string with only spaces", () => {
    const result = getFirstAndLastName("   ");
    expect(result).toEqual({ firstName: null, lastName: null });
  });

  it("should handle names with tabs and newlines", () => {
    const result = getFirstAndLastName("John\tDoe\nSmith");
    expect(result).toEqual({ firstName: "John", lastName: "Smith" });
  });
});

describe("getInitials", () => {
  it("should return initials for first and last name", () => {
    const result = getInitials("John Doe");
    expect(result).toBe("JD");
  });

  it("should return single initial for single name", () => {
    const result = getInitials("John");
    expect(result).toBe("J");
  });

  it("should return first and last initials for multiple names", () => {
    const result = getInitials("John Michael Doe");
    expect(result).toBe("JD");
  });

  it("should handle names with leading and trailing spaces", () => {
    const result = getInitials("  John Doe  ");
    expect(result).toBe("JD");
  });

  it("should return empty string for empty input", () => {
    const result = getInitials("");
    expect(result).toBe("");
  });

  it("should return empty string for string with only spaces", () => {
    const result = getInitials("   ");
    expect(result).toBe("");
  });

  it("should handle lowercase names and return uppercase initials", () => {
    const result = getInitials("john doe");
    expect(result).toBe("JD");
  });

  it("should handle names with special characters", () => {
    const result = getInitials("Jean-Luc Picard");
    expect(result).toBe("JP");
  });

  it("should handle names with tabs and newlines", () => {
    const result = getInitials("John\tDoe\nSmith");
    expect(result).toBe("JS");
  });
});
