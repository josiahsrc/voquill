import { describe, expect, it } from "vitest";
import { getFirstAndLastName, getInitials } from "./string.utils";

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
    expect(result).toEqual({ firstName: "John", lastName: "Michael Doe" });
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
    expect(result).toEqual({ firstName: "John", lastName: "Doe Smith" });
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
