import { describe, expect, it } from "vitest";
import { mergeTranscriptions } from "./transcribe.utils";

describe("mergeTranscriptions", () => {
  describe("basic overlap detection", () => {
    it("should merge transcriptions with overlapping words", () => {
      const result = mergeTranscriptions([
        "I want to eat",
        "to eat milk and cookies",
      ]);
      expect(result).toBe("I want to eat milk and cookies");
    });

    it("should merge with single word overlap", () => {
      const result = mergeTranscriptions(["hello world", "world peace"]);
      expect(result).toBe("hello world peace");
    });

    it("should merge with longer overlap", () => {
      const result = mergeTranscriptions([
        "the quick brown fox",
        "quick brown fox jumps over",
      ]);
      expect(result).toBe("the quick brown fox jumps over");
    });
  });

  describe("no overlap - simple concatenation", () => {
    it("should concatenate when no overlap exists", () => {
      const result = mergeTranscriptions(["I want to", "eat milk"]);
      expect(result).toBe("I want to eat milk");
    });

    it("should concatenate completely different transcriptions", () => {
      const result = mergeTranscriptions(["hello there", "goodbye friend"]);
      expect(result).toBe("hello there goodbye friend");
    });
  });

  describe("multiple transcriptions", () => {
    it("should merge three transcriptions with overlaps", () => {
      const result = mergeTranscriptions(["a b c", "b c d", "c d e"]);
      expect(result).toBe("a b c d e");
    });

    it("should handle mixed overlap and no-overlap", () => {
      const result = mergeTranscriptions([
        "hello world",
        "world peace",
        "is important",
      ]);
      expect(result).toBe("hello world peace is important");
    });

    it("should merge four transcriptions correctly", () => {
      const result = mergeTranscriptions([
        "I want to",
        "want to eat",
        "to eat some",
        "eat some food",
      ]);
      expect(result).toBe("I want to eat some food");
    });
  });

  describe("edge cases", () => {
    it("should return empty string for empty array", () => {
      const result = mergeTranscriptions([]);
      expect(result).toBe("");
    });

    it("should return the single item for single-element array", () => {
      const result = mergeTranscriptions(["hello world"]);
      expect(result).toBe("hello world");
    });

    it("should handle empty string in array", () => {
      const result = mergeTranscriptions(["", "hello world"]);
      expect(result).toBe("hello world");
    });

    it("should handle empty string at end", () => {
      const result = mergeTranscriptions(["hello world", ""]);
      expect(result).toBe("hello world");
    });

    it("should handle empty strings in middle", () => {
      const result = mergeTranscriptions(["hello", "", "world"]);
      expect(result).toBe("hello world");
    });

    it("should handle all empty strings", () => {
      const result = mergeTranscriptions(["", "", ""]);
      expect(result).toBe("");
    });

    it("should handle whitespace-only strings", () => {
      const result = mergeTranscriptions(["  ", "hello", "   "]);
      expect(result).toBe("hello");
    });
  });

  describe("case insensitivity", () => {
    it("should match words case-insensitively", () => {
      const result = mergeTranscriptions(["I want TO eat", "to eat milk"]);
      expect(result).toBe("I want TO eat milk");
    });

    it("should preserve case from first transcription", () => {
      const result = mergeTranscriptions(["Hello World", "world peace"]);
      expect(result).toBe("Hello World peace");
    });

    it("should handle mixed case overlaps", () => {
      const result = mergeTranscriptions([
        "THE QUICK brown",
        "Brown FOX jumps",
      ]);
      expect(result).toBe("THE QUICK brown FOX jumps");
    });
  });

  describe("punctuation handling", () => {
    it("should match words with different punctuation", () => {
      const result = mergeTranscriptions([
        "I want to eat.",
        "to eat, milk and cookies",
      ]);
      expect(result).toBe("I want to eat. milk and cookies");
    });

    it("should handle question marks and exclamation points", () => {
      const result = mergeTranscriptions(["how are you?", "you! I am fine"]);
      expect(result).toBe("how are you? I am fine");
    });

    it("should handle quotes in words", () => {
      const result = mergeTranscriptions(['he said "hello', 'hello world"']);
      expect(result).toBe('he said "hello world"');
    });
  });

  describe("complete overlap scenarios", () => {
    it("should handle when second is fully contained in overlap", () => {
      const result = mergeTranscriptions(["hello world", "world"]);
      expect(result).toBe("hello world");
    });

    it("should handle identical transcriptions", () => {
      const result = mergeTranscriptions(["hello world", "hello world"]);
      expect(result).toBe("hello world");
    });

    it("should handle when first is prefix of second", () => {
      const result = mergeTranscriptions(["hello", "hello world"]);
      expect(result).toBe("hello world");
    });
  });

  describe("whitespace handling", () => {
    it("should handle extra whitespace between words", () => {
      const result = mergeTranscriptions(["hello   world", "world  peace"]);
      expect(result).toBe("hello   world peace");
    });

    it("should handle leading and trailing whitespace", () => {
      const result = mergeTranscriptions([
        "  hello world  ",
        "  world peace  ",
      ]);
      expect(result).toBe("hello world peace");
    });

    it("should handle tabs and newlines", () => {
      const result = mergeTranscriptions(["hello\tworld", "world\npeace"]);
      expect(result).toBe("hello\tworld peace");
    });
  });

  describe("realistic transcription scenarios", () => {
    it("should merge realistic speech segments", () => {
      const result = mergeTranscriptions([
        "So I was thinking about going to the",
        "going to the store tomorrow",
        "the store tomorrow and picking up some groceries",
      ]);
      expect(result).toBe(
        "So I was thinking about going to the store tomorrow and picking up some groceries",
      );
    });

    it("should handle partial sentence overlaps", () => {
      const result = mergeTranscriptions([
        "The weather today is really",
        "is really nice and sunny",
        "nice and sunny outside",
      ]);
      expect(result).toBe("The weather today is really nice and sunny outside");
    });

    it("should handle technical speech with numbers", () => {
      const result = mergeTranscriptions([
        "The value is 42 and",
        "42 and the result is",
        "the result is 100",
      ]);
      expect(result).toBe("The value is 42 and the result is 100");
    });
  });
});
