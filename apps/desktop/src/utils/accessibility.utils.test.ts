import { describe, expect, it } from "vitest";
import type { AccessibilityInfo } from "../types/accessibility.types";
import {
  applySpacingInContext,
  extractFollowingText,
  extractPrecedingText,
  extractSelectedText,
  extractTextFieldContext,
} from "./accessibility.utils";

describe("extractPrecedingText", () => {
  it("should return text before cursor up to limit", () => {
    const info: AccessibilityInfo = {
      textContent: "Hello world, this is a test.",
      cursorPosition: 12,
      selectionLength: 0,
    };
    expect(extractPrecedingText(info, 100)).toBe("Hello world,");
  });

  it("should truncate to limit when preceding text is longer", () => {
    const info: AccessibilityInfo = {
      textContent: "The quick brown fox jumps over the lazy dog.",
      cursorPosition: 20, // "The quick brown fox "
      selectionLength: 0,
    };
    expect(extractPrecedingText(info, 10)).toBe("brown fox ");
  });

  it("should return full preceding text when shorter than limit", () => {
    const info: AccessibilityInfo = {
      textContent: "Hi there!",
      cursorPosition: 3,
      selectionLength: 0,
    };
    expect(extractPrecedingText(info, 100)).toBe("Hi ");
  });

  it("should return null when cursor is at start", () => {
    const info: AccessibilityInfo = {
      textContent: "Hello world",
      cursorPosition: 0,
      selectionLength: 0,
    };
    expect(extractPrecedingText(info, 100)).toBeNull();
  });

  it("should return null when textContent is null", () => {
    const info: AccessibilityInfo = {
      textContent: null,
      cursorPosition: 5,
      selectionLength: 0,
    };
    expect(extractPrecedingText(info, 100)).toBeNull();
  });

  it("should return null when cursorPosition is null", () => {
    const info: AccessibilityInfo = {
      textContent: "Hello world",
      cursorPosition: null,
      selectionLength: 0,
    };
    expect(extractPrecedingText(info, 100)).toBeNull();
  });

  it("should handle cursor at end of text", () => {
    const info: AccessibilityInfo = {
      textContent: "Short",
      cursorPosition: 5,
      selectionLength: 0,
    };
    expect(extractPrecedingText(info, 100)).toBe("Short");
  });

  it("should handle limit of 0", () => {
    const info: AccessibilityInfo = {
      textContent: "Hello world",
      cursorPosition: 5,
      selectionLength: 0,
    };
    expect(extractPrecedingText(info, 0)).toBe("");
  });
});

describe("extractSelectedText", () => {
  it("should return selected text", () => {
    const info: AccessibilityInfo = {
      textContent: "Hello world, this is a test.",
      cursorPosition: 6,
      selectionLength: 5, // "world"
    };
    expect(extractSelectedText(info)).toBe("world");
  });

  it("should return null when no selection", () => {
    const info: AccessibilityInfo = {
      textContent: "Hello world",
      cursorPosition: 5,
      selectionLength: 0,
    };
    expect(extractSelectedText(info)).toBeNull();
  });

  it("should return null when selectionLength is null", () => {
    const info: AccessibilityInfo = {
      textContent: "Hello world",
      cursorPosition: 5,
      selectionLength: null,
    };
    expect(extractSelectedText(info)).toBeNull();
  });

  it("should return null when textContent is null", () => {
    const info: AccessibilityInfo = {
      textContent: null,
      cursorPosition: 5,
      selectionLength: 3,
    };
    expect(extractSelectedText(info)).toBeNull();
  });

  it("should return null when cursorPosition is null", () => {
    const info: AccessibilityInfo = {
      textContent: "Hello world",
      cursorPosition: null,
      selectionLength: 3,
    };
    expect(extractSelectedText(info)).toBeNull();
  });

  it("should handle selection at start of text", () => {
    const info: AccessibilityInfo = {
      textContent: "Hello world",
      cursorPosition: 0,
      selectionLength: 5,
    };
    expect(extractSelectedText(info)).toBe("Hello");
  });

  it("should handle selection at end of text", () => {
    const info: AccessibilityInfo = {
      textContent: "Hello world",
      cursorPosition: 6,
      selectionLength: 5,
    };
    expect(extractSelectedText(info)).toBe("world");
  });

  it("should handle full text selection", () => {
    const info: AccessibilityInfo = {
      textContent: "Hello world",
      cursorPosition: 0,
      selectionLength: 11,
    };
    expect(extractSelectedText(info)).toBe("Hello world");
  });

  it("should return null for out of bounds selection", () => {
    const info: AccessibilityInfo = {
      textContent: "Hello",
      cursorPosition: 3,
      selectionLength: 10, // Would go past end
    };
    expect(extractSelectedText(info)).toBeNull();
  });

  it("should return null for negative cursor position", () => {
    const info: AccessibilityInfo = {
      textContent: "Hello world",
      cursorPosition: -1,
      selectionLength: 3,
    };
    expect(extractSelectedText(info)).toBeNull();
  });
});

describe("extractFollowingText", () => {
  it("should return text after cursor up to limit", () => {
    const info: AccessibilityInfo = {
      textContent: "Hello world, this is a test.",
      cursorPosition: 13, // after "Hello world, "
      selectionLength: 0,
    };
    expect(extractFollowingText(info, 100)).toBe("this is a test.");
  });

  it("should truncate to limit when following text is longer", () => {
    const info: AccessibilityInfo = {
      textContent: "The quick brown fox jumps over the lazy dog.",
      cursorPosition: 0,
      selectionLength: 0,
    };
    expect(extractFollowingText(info, 10)).toBe("The quick ");
  });

  it("should return full following text when shorter than limit", () => {
    const info: AccessibilityInfo = {
      textContent: "Hello world",
      cursorPosition: 6,
      selectionLength: 0,
    };
    expect(extractFollowingText(info, 100)).toBe("world");
  });

  it("should return null when cursor is at end", () => {
    const info: AccessibilityInfo = {
      textContent: "Hello world",
      cursorPosition: 11,
      selectionLength: 0,
    };
    expect(extractFollowingText(info, 100)).toBeNull();
  });

  it("should return null when textContent is null", () => {
    const info: AccessibilityInfo = {
      textContent: null,
      cursorPosition: 5,
      selectionLength: 0,
    };
    expect(extractFollowingText(info, 100)).toBeNull();
  });

  it("should return null when cursorPosition is null", () => {
    const info: AccessibilityInfo = {
      textContent: "Hello world",
      cursorPosition: null,
      selectionLength: 0,
    };
    expect(extractFollowingText(info, 100)).toBeNull();
  });

  it("should account for selection length", () => {
    const info: AccessibilityInfo = {
      textContent: "Hello world, this is a test.",
      cursorPosition: 6,
      selectionLength: 5, // "world" is selected
    };
    // Following text starts after selection
    expect(extractFollowingText(info, 100)).toBe(", this is a test.");
  });

  it("should handle cursor at start with no selection", () => {
    const info: AccessibilityInfo = {
      textContent: "Hello",
      cursorPosition: 0,
      selectionLength: 0,
    };
    expect(extractFollowingText(info, 100)).toBe("Hello");
  });

  it("should handle limit of 0", () => {
    const info: AccessibilityInfo = {
      textContent: "Hello world",
      cursorPosition: 0,
      selectionLength: 0,
    };
    expect(extractFollowingText(info, 0)).toBe("");
  });
});

describe("extractTextFieldContext", () => {
  it("should extract all context parts", () => {
    const info: AccessibilityInfo = {
      textContent: "Hello world, this is a test.",
      cursorPosition: 12,
      selectionLength: 5, // " this" is selected
    };
    const context = extractTextFieldContext(info);
    expect(context).toEqual({
      precedingText: "Hello world,",
      selectedText: " this",
      followingText: " is a test.",
    });
  });

  it("should return null for null info", () => {
    expect(extractTextFieldContext(null)).toBeNull();
  });

  it("should return null when no context is available", () => {
    const info: AccessibilityInfo = {
      textContent: null,
      cursorPosition: null,
      selectionLength: null,
    };
    expect(extractTextFieldContext(info)).toBeNull();
  });

  it("should respect custom preceding limit", () => {
    const info: AccessibilityInfo = {
      textContent: "The quick brown fox jumps.",
      cursorPosition: 20, // "The quick brown fox "
      selectionLength: 0,
    };
    const context = extractTextFieldContext(info, { precedingCharLimit: 5 });
    // Last 5 chars of "The quick brown fox " is " fox " (space, f, o, x, space)
    expect(context?.precedingText).toBe(" fox ");
  });

  it("should respect custom following limit", () => {
    const info: AccessibilityInfo = {
      textContent: "The quick brown fox jumps.",
      cursorPosition: 0,
      selectionLength: 0,
    };
    const context = extractTextFieldContext(info, { followingCharLimit: 10 });
    expect(context?.followingText).toBe("The quick ");
  });

  it("should return context with only preceding text", () => {
    const info: AccessibilityInfo = {
      textContent: "Hello world",
      cursorPosition: 11, // at end
      selectionLength: 0,
    };
    const context = extractTextFieldContext(info);
    expect(context).toEqual({
      precedingText: "Hello world",
      selectedText: null,
      followingText: null,
    });
  });

  it("should return context with only following text", () => {
    const info: AccessibilityInfo = {
      textContent: "Hello world",
      cursorPosition: 0,
      selectionLength: 0,
    };
    const context = extractTextFieldContext(info);
    expect(context).toEqual({
      precedingText: null,
      selectedText: null,
      followingText: "Hello world",
    });
  });

  it("should return context with only selected text", () => {
    const info: AccessibilityInfo = {
      textContent: "Hello",
      cursorPosition: 0,
      selectionLength: 5, // full text selected
    };
    const context = extractTextFieldContext(info);
    expect(context).toEqual({
      precedingText: null,
      selectedText: "Hello",
      followingText: null,
    });
  });

  it("should handle mid-sentence cursor with no selection", () => {
    const info: AccessibilityInfo = {
      textContent: "The quick brown fox jumps over the lazy dog.",
      cursorPosition: 20, // after "The quick brown fox "
      selectionLength: 0,
    };
    const context = extractTextFieldContext(info, {
      precedingCharLimit: 15,
      followingCharLimit: 15,
    });
    // Last 15 chars of "The quick brown fox " is "uick brown fox "
    // First 15 chars of "jumps over the lazy dog." is "jumps over the "
    expect(context).toEqual({
      precedingText: "uick brown fox ",
      selectedText: null,
      followingText: "jumps over the ",
    });
  });

  it("should use default limits when not specified", () => {
    // Create a long text
    const longText = "a".repeat(300) + "|CURSOR|" + "b".repeat(200);
    const cursorPos = 300;
    const info: AccessibilityInfo = {
      textContent: longText,
      cursorPosition: cursorPos,
      selectionLength: 8, // "|CURSOR|"
    };
    const context = extractTextFieldContext(info);
    // Default preceding limit is 200, following is 100
    expect(context?.precedingText?.length).toBe(200);
    expect(context?.selectedText).toBe("|CURSOR|");
    expect(context?.followingText?.length).toBe(100);
  });
});

describe("applySpacingInContext", () => {
  it("should add space before when inserting after non-whitespace", () => {
    const info: AccessibilityInfo = {
      textContent: "Hello world",
      cursorPosition: 5, // after "Hello"
      selectionLength: 0,
    };
    const result = applySpacingInContext({
      textToInsert: "there",
      info,
    });
    expect(result).toBe(" there");
  });

  it("should add space after when inserting before non-whitespace", () => {
    const info: AccessibilityInfo = {
      textContent: "Hello world",
      cursorPosition: 6, // before "world"
      selectionLength: 0,
    };
    const result = applySpacingInContext({
      textToInsert: "beautiful",
      info,
    });
    expect(result).toBe("beautiful ");
  });

  it("should add spaces both before and after when surrounded by non-whitespace", () => {
    const info: AccessibilityInfo = {
      textContent: "Helloworld",
      cursorPosition: 5, // between "Hello" and "world"
      selectionLength: 0,
    };
    const result = applySpacingInContext({
      textToInsert: "beautiful",
      info,
    });
    expect(result).toBe(" beautiful ");
  });

  it("should not add space before when there is already a space before", () => {
    const info: AccessibilityInfo = {
      textContent: "Hello world",
      cursorPosition: 6, // after "Hello " (space)
      selectionLength: 0,
    };
    const result = applySpacingInContext({
      textToInsert: "beautiful",
      info,
    });
    expect(result).toBe("beautiful ");
  });

  it("should not add space after when there is already a space after", () => {
    const info: AccessibilityInfo = {
      textContent: "Hello world",
      cursorPosition: 5, // before " world"
      selectionLength: 0,
    };
    const result = applySpacingInContext({
      textToInsert: "beautiful",
      info,
    });
    expect(result).toBe(" beautiful");
  });

  it("should not add spaces when text already has surrounding spaces", () => {
    const info: AccessibilityInfo = {
      textContent: "Hello world",
      cursorPosition: 6, // at the space position, replacing it
      selectionLength: 0,
    };
    const result = applySpacingInContext({
      textToInsert: "beautiful",
      info,
    });
    // Before cursor is " ", after cursor is "w"
    expect(result).toBe("beautiful ");
  });

  it("should not add space before when at start of text", () => {
    const info: AccessibilityInfo = {
      textContent: "world",
      cursorPosition: 0,
      selectionLength: 0,
    };
    const result = applySpacingInContext({
      textToInsert: "Hello",
      info,
    });
    expect(result).toBe("Hello ");
  });

  it("should not add space after when at end of text", () => {
    const info: AccessibilityInfo = {
      textContent: "Hello",
      cursorPosition: 5, // at end
      selectionLength: 0,
    };
    const result = applySpacingInContext({
      textToInsert: "world",
      info,
    });
    expect(result).toBe(" world");
  });

  it("should not add any spaces when inserting into empty field", () => {
    const info: AccessibilityInfo = {
      textContent: "",
      cursorPosition: 0,
      selectionLength: 0,
    };
    const result = applySpacingInContext({
      textToInsert: "Hello",
      info,
    });
    expect(result).toBe("Hello");
  });

  it("should return text as-is when textContent is null", () => {
    const info: AccessibilityInfo = {
      textContent: null,
      cursorPosition: 5,
      selectionLength: 0,
    };
    const result = applySpacingInContext({
      textToInsert: "Hello",
      info,
    });
    expect(result).toBe("Hello");
  });

  it("should return text as-is when cursorPosition is null", () => {
    const info: AccessibilityInfo = {
      textContent: "Hello world",
      cursorPosition: null,
      selectionLength: 0,
    };
    const result = applySpacingInContext({
      textToInsert: "test",
      info,
    });
    expect(result).toBe("test");
  });

  it("should return empty string when inserting empty text", () => {
    const info: AccessibilityInfo = {
      textContent: "Hello world",
      cursorPosition: 5,
      selectionLength: 0,
    };
    const result = applySpacingInContext({
      textToInsert: "",
      info,
    });
    expect(result).toBe("");
  });

  it("should not add space before when text to insert starts with space", () => {
    const info: AccessibilityInfo = {
      textContent: "Helloworld",
      cursorPosition: 5,
      selectionLength: 0,
    };
    const result = applySpacingInContext({
      textToInsert: " beautiful",
      info,
    });
    expect(result).toBe(" beautiful ");
  });

  it("should not add space after when text to insert ends with space", () => {
    const info: AccessibilityInfo = {
      textContent: "Helloworld",
      cursorPosition: 5,
      selectionLength: 0,
    };
    const result = applySpacingInContext({
      textToInsert: "beautiful ",
      info,
    });
    expect(result).toBe(" beautiful ");
  });

  it("should handle newline as whitespace before cursor", () => {
    const info: AccessibilityInfo = {
      textContent: "Hello\nworld",
      cursorPosition: 6, // after newline
      selectionLength: 0,
    };
    const result = applySpacingInContext({
      textToInsert: "beautiful",
      info,
    });
    expect(result).toBe("beautiful ");
  });

  it("should handle newline as whitespace after cursor", () => {
    const info: AccessibilityInfo = {
      textContent: "Hello\nworld",
      cursorPosition: 5, // before newline
      selectionLength: 0,
    };
    const result = applySpacingInContext({
      textToInsert: "beautiful",
      info,
    });
    expect(result).toBe(" beautiful");
  });

  it("should handle tab as whitespace", () => {
    const info: AccessibilityInfo = {
      textContent: "Hello\tworld",
      cursorPosition: 6, // after tab
      selectionLength: 0,
    };
    const result = applySpacingInContext({
      textToInsert: "beautiful",
      info,
    });
    expect(result).toBe("beautiful ");
  });

  it("should account for selection when determining following text", () => {
    const info: AccessibilityInfo = {
      textContent: "Hello world",
      cursorPosition: 6,
      selectionLength: 5, // "world" is selected
    };
    // Replacing "world", nothing after
    const result = applySpacingInContext({
      textToInsert: "there",
      info,
    });
    expect(result).toBe("there");
  });

  it("should add space after when replacing selected text with content following", () => {
    const info: AccessibilityInfo = {
      textContent: "Hello world today",
      cursorPosition: 6,
      selectionLength: 5, // "world" is selected
    };
    // Replacing "world", " today" follows (space then "today")
    const result = applySpacingInContext({
      textToInsert: "there",
      info,
    });
    expect(result).toBe("there");
  });

  it("should add space when replacing with non-whitespace following", () => {
    const info: AccessibilityInfo = {
      textContent: "Hello worldtoday",
      cursorPosition: 6,
      selectionLength: 5, // "world" is selected
    };
    // Replacing "world", "today" follows directly (no space)
    const result = applySpacingInContext({
      textToInsert: "there",
      info,
    });
    expect(result).toBe("there ");
  });
});
