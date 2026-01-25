import { describe, expect, it } from "vitest";
import { DictionaryEntries } from "./prompt.utils";
import { applyReplacementRules, normalizeWord } from "./replacement.utils";

describe("normalizeWord", () => {
  it("should convert to lowercase", () => {
    expect(normalizeWord("HELLO")).toBe("hello");
    expect(normalizeWord("Hello")).toBe("hello");
    expect(normalizeWord("HeLLo")).toBe("hello");
  });

  it("should remove punctuation", () => {
    expect(normalizeWord("hello!")).toBe("hello");
    expect(normalizeWord("hello,")).toBe("hello");
    expect(normalizeWord("hello.")).toBe("hello");
    expect(normalizeWord("hello?")).toBe("hello");
    expect(normalizeWord('"hello"')).toBe("hello");
    expect(normalizeWord("'hello'")).toBe("hello");
  });

  it("should remove multiple punctuation marks", () => {
    expect(normalizeWord("hello!!!")).toBe("hello");
    expect(normalizeWord("...hello...")).toBe("hello");
    expect(normalizeWord("(hello)")).toBe("hello");
  });

  it("should preserve letters and numbers", () => {
    expect(normalizeWord("GPT4")).toBe("gpt4");
    expect(normalizeWord("API2023")).toBe("api2023");
  });

  it("should handle empty string", () => {
    expect(normalizeWord("")).toBe("");
  });

  it("should handle punctuation-only string", () => {
    expect(normalizeWord("!!!")).toBe("");
    expect(normalizeWord("...")).toBe("");
  });

  it("should handle unicode characters", () => {
    expect(normalizeWord("Café")).toBe("café");
    expect(normalizeWord("naïve")).toBe("naïve");
  });
});

describe("applyReplacementRules", () => {
  const createEntries = (
    replacements: Array<{ source: string; destination: string }>,
  ): DictionaryEntries => ({
    sources: [],
    replacements,
  });

  describe("basic replacement", () => {
    it("should replace a single word", () => {
      const entries = createEntries([
        { source: "GPT", destination: "ChatGPT" },
      ]);
      expect(applyReplacementRules("I use GPT daily", entries)).toBe(
        "I use ChatGPT daily",
      );
    });

    it("should replace multiple occurrences of the same word", () => {
      const entries = createEntries([
        { source: "GPT", destination: "ChatGPT" },
      ]);
      expect(applyReplacementRules("GPT is great. I love GPT.", entries)).toBe(
        "ChatGPT is great. I love ChatGPT.",
      );
    });

    it("should replace multiple different words", () => {
      const entries = createEntries([
        { source: "GPT", destination: "ChatGPT" },
        { source: "API", destination: "Application Programming Interface" },
      ]);
      expect(applyReplacementRules("Use GPT via API", entries)).toBe(
        "Use ChatGPT via Application Programming Interface",
      );
    });
  });

  describe("case insensitivity", () => {
    it("should replace regardless of case in transcript", () => {
      const entries = createEntries([
        { source: "gpt", destination: "ChatGPT" },
      ]);
      expect(applyReplacementRules("I use gpt daily", entries)).toBe(
        "I use ChatGPT daily",
      );
      expect(applyReplacementRules("I use GPT daily", entries)).toBe(
        "I use ChatGPT daily",
      );
      expect(applyReplacementRules("I use Gpt daily", entries)).toBe(
        "I use ChatGPT daily",
      );
    });

    it("should match regardless of case in source key", () => {
      const entries = createEntries([
        { source: "GPT", destination: "ChatGPT" },
      ]);
      expect(applyReplacementRules("I use gpt daily", entries)).toBe(
        "I use ChatGPT daily",
      );
    });
  });

  describe("punctuation handling", () => {
    it("should replace word with trailing punctuation", () => {
      const entries = createEntries([
        { source: "GPT", destination: "ChatGPT" },
      ]);
      expect(applyReplacementRules("I use GPT.", entries)).toBe(
        "I use ChatGPT.",
      );
      expect(applyReplacementRules("I use GPT!", entries)).toBe(
        "I use ChatGPT!",
      );
      expect(applyReplacementRules("I use GPT?", entries)).toBe(
        "I use ChatGPT?",
      );
      expect(applyReplacementRules("I use GPT,", entries)).toBe(
        "I use ChatGPT,",
      );
    });

    it("should preserve multiple punctuation marks", () => {
      const entries = createEntries([
        { source: "GPT", destination: "ChatGPT" },
      ]);
      expect(applyReplacementRules("I use GPT!!!", entries)).toBe(
        "I use ChatGPT!!!",
      );
      expect(applyReplacementRules("Wait... GPT?!", entries)).toBe(
        "Wait... ChatGPT?!",
      );
    });

    it("should replace word with leading punctuation", () => {
      const entries = createEntries([
        { source: "GPT", destination: "ChatGPT" },
      ]);
      expect(applyReplacementRules('I use "GPT"', entries)).toBe(
        'I use "ChatGPT"',
      );
      expect(applyReplacementRules("I use (GPT)", entries)).toBe(
        "I use (ChatGPT)",
      );
    });

    it("should replace word surrounded by punctuation", () => {
      const entries = createEntries([
        { source: "GPT", destination: "ChatGPT" },
      ]);
      expect(applyReplacementRules('I use "GPT."', entries)).toBe(
        'I use "ChatGPT."',
      );
      expect(applyReplacementRules("I use (GPT).", entries)).toBe(
        "I use (ChatGPT).",
      );
    });
  });

  describe("whitespace preservation", () => {
    it("should preserve single spaces", () => {
      const entries = createEntries([
        { source: "GPT", destination: "ChatGPT" },
      ]);
      expect(applyReplacementRules("I use GPT daily", entries)).toBe(
        "I use ChatGPT daily",
      );
    });

    it("should preserve multiple spaces", () => {
      const entries = createEntries([
        { source: "GPT", destination: "ChatGPT" },
      ]);
      expect(applyReplacementRules("I use  GPT  daily", entries)).toBe(
        "I use  ChatGPT  daily",
      );
    });

    it("should preserve leading/trailing whitespace", () => {
      const entries = createEntries([
        { source: "GPT", destination: "ChatGPT" },
      ]);
      expect(applyReplacementRules("  GPT  ", entries)).toBe("  ChatGPT  ");
    });

    it("should preserve newlines", () => {
      const entries = createEntries([
        { source: "GPT", destination: "ChatGPT" },
      ]);
      expect(applyReplacementRules("I use\nGPT\ndaily", entries)).toBe(
        "I use\nChatGPT\ndaily",
      );
    });

    it("should preserve tabs", () => {
      const entries = createEntries([
        { source: "GPT", destination: "ChatGPT" },
      ]);
      expect(applyReplacementRules("I use\tGPT\tdaily", entries)).toBe(
        "I use\tChatGPT\tdaily",
      );
    });
  });

  describe("word boundaries", () => {
    it("should not replace partial word matches", () => {
      const entries = createEntries([
        { source: "API", destination: "Application Programming Interface" },
      ]);
      expect(applyReplacementRules("I use rapid API calls", entries)).toBe(
        "I use rapid Application Programming Interface calls",
      );
    });

    it("should replace at start of string", () => {
      const entries = createEntries([
        { source: "GPT", destination: "ChatGPT" },
      ]);
      expect(applyReplacementRules("GPT is amazing", entries)).toBe(
        "ChatGPT is amazing",
      );
    });

    it("should replace at end of string", () => {
      const entries = createEntries([
        { source: "GPT", destination: "ChatGPT" },
      ]);
      expect(applyReplacementRules("I use GPT", entries)).toBe("I use ChatGPT");
    });

    it("should replace single word string", () => {
      const entries = createEntries([
        { source: "GPT", destination: "ChatGPT" },
      ]);
      expect(applyReplacementRules("GPT", entries)).toBe("ChatGPT");
    });
  });

  describe("no replacement scenarios", () => {
    it("should return original text when no rules match", () => {
      const entries = createEntries([
        { source: "GPT", destination: "ChatGPT" },
      ]);
      expect(applyReplacementRules("I use other tools", entries)).toBe(
        "I use other tools",
      );
    });

    it("should return original text when no rules provided", () => {
      const entries = createEntries([]);
      expect(applyReplacementRules("I use GPT daily", entries)).toBe(
        "I use GPT daily",
      );
    });

    it("should handle empty string", () => {
      const entries = createEntries([
        { source: "GPT", destination: "ChatGPT" },
      ]);
      expect(applyReplacementRules("", entries)).toBe("");
    });

    it("should preserve text with no matches", () => {
      const entries = createEntries([
        { source: "GPT", destination: "ChatGPT" },
        { source: "API", destination: "Application Programming Interface" },
      ]);
      expect(applyReplacementRules("Hello world!", entries)).toBe(
        "Hello world!",
      );
    });
  });

  describe("complex real-world scenarios", () => {
    it("should handle email-like text", () => {
      const entries = createEntries([
        { source: "GPT", destination: "ChatGPT" },
        { source: "API", destination: "Application Programming Interface" },
      ]);
      expect(
        applyReplacementRules(
          "Hi John,\n\nI've been using GPT and its API. It's great!\n\nThanks,\nJane",
          entries,
        ),
      ).toBe(
        "Hi John,\n\nI've been using ChatGPT and its Application Programming Interface. It's great!\n\nThanks,\nJane",
      );
    });

    it("should handle technical documentation", () => {
      const entries = createEntries([
        { source: "REST", destination: "RESTful" },
        { source: "API", destination: "Application Programming Interface" },
      ]);
      expect(
        applyReplacementRules(
          "The REST API provides endpoints for data access.",
          entries,
        ),
      ).toBe(
        "The RESTful Application Programming Interface provides endpoints for data access.",
      );
    });

    it("should handle lists", () => {
      const entries = createEntries([
        { source: "GPT", destination: "ChatGPT" },
      ]);
      expect(
        applyReplacementRules(
          "1. Install GPT\n2. Configure GPT\n3. Use GPT",
          entries,
        ),
      ).toBe("1. Install ChatGPT\n2. Configure ChatGPT\n3. Use ChatGPT");
    });

    it("should handle quoted text", () => {
      const entries = createEntries([
        { source: "GPT", destination: "ChatGPT" },
      ]);
      expect(
        applyReplacementRules(
          'He said, "GPT is amazing," and I agreed.',
          entries,
        ),
      ).toBe('He said, "ChatGPT is amazing," and I agreed.');
    });
  });

  describe("special characters in replacements", () => {
    it("should handle destination with spaces", () => {
      const entries = createEntries([
        { source: "JS", destination: "JavaScript Framework" },
      ]);
      expect(applyReplacementRules("I use JS daily", entries)).toBe(
        "I use JavaScript Framework daily",
      );
    });

    it("should handle destination with punctuation", () => {
      const entries = createEntries([{ source: "etc", destination: "etc." }]);
      expect(applyReplacementRules("apples, oranges, etc", entries)).toBe(
        "apples, oranges, etc.",
      );
    });

    it("should handle destination with numbers", () => {
      const entries = createEntries([
        { source: "Python", destination: "Python 3.11" },
      ]);
      expect(applyReplacementRules("I code in Python", entries)).toBe(
        "I code in Python 3.11",
      );
    });
  });

  describe("edge cases with numbers", () => {
    it("should replace words with numbers", () => {
      const entries = createEntries([{ source: "GPT4", destination: "GPT-4" }]);
      expect(applyReplacementRules("I use GPT4 for coding", entries)).toBe(
        "I use GPT-4 for coding",
      );
    });

    it("should handle replacements with only numbers", () => {
      const entries = createEntries([
        { source: "123", destination: "one-two-three" },
      ]);
      expect(applyReplacementRules("Code 123 activated", entries)).toBe(
        "Code one-two-three activated",
      );
    });
  });

  describe("multiple rules with overlapping patterns", () => {
    it("should use last rule when duplicate sources exist", () => {
      // When the same source appears multiple times, the map will keep the last one
      const entries = createEntries([
        { source: "API", destination: "Application Programming Interface" },
        { source: "API", destination: "Another Replacement" },
      ]);
      expect(applyReplacementRules("Use the API", entries)).toBe(
        "Use the Another Replacement",
      );
    });

    it("should handle rules with similar but different sources", () => {
      const entries = createEntries([
        { source: "GPT", destination: "ChatGPT" },
        { source: "GPT4", destination: "GPT-4" },
      ]);
      expect(applyReplacementRules("I use GPT and GPT4", entries)).toBe(
        "I use ChatGPT and GPT-4",
      );
    });
  });
});
