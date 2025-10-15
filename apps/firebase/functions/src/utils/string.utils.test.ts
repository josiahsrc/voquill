import { countWords } from "./string.utils";

describe("countWords", () => {
  it("should count words in a normal sentence", () => {
    expect(countWords("Hello world")).toBe(2);
  });

  it("should count words with multiple spaces", () => {
    expect(countWords("Hello    world   test")).toBe(3);
  });

  it("should handle empty string", () => {
    expect(countWords("")).toBe(0);
  });

  it("should handle string with only spaces", () => {
    expect(countWords("   ")).toBe(0);
  });

  it("should count single word", () => {
    expect(countWords("Hello")).toBe(1);
  });

  it("should handle string with leading and trailing spaces", () => {
    expect(countWords("  Hello world  ")).toBe(2);
  });

  it("should handle string with tabs and newlines", () => {
    expect(countWords("Hello\tworld\ntest")).toBe(3);
  });

  it("should count words in a longer sentence", () => {
    expect(countWords("The quick brown fox jumps over the lazy dog")).toBe(9);
  });

  it("should count long words as multiple words", () => {
    const twoHundredChars = "a".repeat(200);
    expect(countWords(twoHundredChars)).toBe(2);
    expect(countWords("Short " + twoHundredChars)).toBe(3);
  });
});
