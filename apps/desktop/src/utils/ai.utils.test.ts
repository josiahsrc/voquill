import { describe, expect, it } from "vitest";
import { unwrapNestedLlmResponse } from "./ai.utils";

describe("unwrapNestedLlmResponse", () => {
  it("should return original object when value is already a string", () => {
    const input = { processedTranscription: "Hello world" };
    const result = unwrapNestedLlmResponse(input, "processedTranscription");
    expect(result).toEqual({ processedTranscription: "Hello world" });
  });

  it("should unwrap nested response when LLM wraps in schema name", () => {
    const input = {
      processedTranscription: {
        type: "transcription_cleaning",
        processedTranscription: "Hello world",
      },
    };
    const result = unwrapNestedLlmResponse(input, "processedTranscription");
    expect(result).toEqual({ processedTranscription: "Hello world" });
  });

  it("should preserve other fields when unwrapping", () => {
    const input = {
      processedTranscription: {
        processedTranscription: "Hello world",
      },
      otherField: "preserved",
    };
    const result = unwrapNestedLlmResponse(input, "processedTranscription");
    expect(result).toEqual({
      processedTranscription: "Hello world",
      otherField: "preserved",
    });
  });

  it("should not unwrap when nested value is not a string", () => {
    const input = {
      processedTranscription: {
        processedTranscription: 123,
      },
    };
    const result = unwrapNestedLlmResponse(input, "processedTranscription");
    expect(result).toEqual(input);
  });

  it("should not unwrap arrays", () => {
    const input = {
      items: ["a", "b", "c"],
    };
    const result = unwrapNestedLlmResponse(input, "items");
    expect(result).toEqual(input);
  });

  it("should handle null values", () => {
    const input = { processedTranscription: null };
    const result = unwrapNestedLlmResponse(
      input as Record<string, unknown>,
      "processedTranscription",
    );
    expect(result).toEqual({ processedTranscription: null });
  });

  it("should handle undefined values", () => {
    const input = { processedTranscription: undefined };
    const result = unwrapNestedLlmResponse(input, "processedTranscription");
    expect(result).toEqual({ processedTranscription: undefined });
  });

  it("should not unwrap when key does not exist in nested object", () => {
    const input = {
      processedTranscription: {
        someOtherKey: "value",
      },
    };
    const result = unwrapNestedLlmResponse(input, "processedTranscription");
    expect(result).toEqual(input);
  });

  it("should work with different key names", () => {
    const input = {
      result: {
        result: "extracted value",
      },
    };
    const result = unwrapNestedLlmResponse(input, "result");
    expect(result).toEqual({ result: "extracted value" });
  });

  it("should handle empty string values", () => {
    const input = {
      processedTranscription: {
        processedTranscription: "",
      },
    };
    const result = unwrapNestedLlmResponse(input, "processedTranscription");
    expect(result).toEqual({ processedTranscription: "" });
  });
});
