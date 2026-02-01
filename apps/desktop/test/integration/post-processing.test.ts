import { describe, expect, it, vi } from "vitest";
import { GroqGenerateTextRepo } from "../../src/repos/generate-text.repo";
import type { TextFieldContext } from "../../src/utils/accessibility.utils";
import {
  buildLocalizedPostProcessingPrompt,
  PROCESSED_TRANSCRIPTION_JSON_SCHEMA,
  PROCESSED_TRANSCRIPTION_SCHEMA,
} from "../../src/utils/prompt.utils";
import { getStringSimilarity } from "../../src/utils/string.utils";
import { getGroqApiKey } from "../helpers/env.utils";

vi.mock("../../src/i18n/intl", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../src/i18n/intl")>();
  return {
    ...actual,
    getIntl: () => ({
      formatMessage: (descriptor: { defaultMessage: string }) =>
        descriptor.defaultMessage,
    }),
  };
});

import { getDefaultSystemTones } from "../../src/utils/tone.utils";

const SYSTEM_PROMPT =
  "You are a transcript rewriting assistant. You modify the style and tone of the transcript while keeping the subject matter the same.";

const getDefaultStyle = (): string => {
  return getDefaultSystemTones().find((t) => t.id === "default")!
    .promptTemplate;
};

describe("Post-processing prompts integration", () => {
  const callLLM = async (prompt: string): Promise<string> => {
    const apiKey = getGroqApiKey();
    const repo = new GroqGenerateTextRepo(apiKey, null);

    const output = await repo.generateText({
      system: SYSTEM_PROMPT,
      prompt,
      jsonResponse: {
        name: "transcription_cleaning",
        description: "JSON response with the processed transcription",
        schema: PROCESSED_TRANSCRIPTION_JSON_SCHEMA,
      },
    });

    const parsed = PROCESSED_TRANSCRIPTION_SCHEMA.parse(
      JSON.parse(output.text),
    );
    return parsed.processedTranscription;
  };

  describe("no context (basic cleaning)", () => {
    it("should clean transcript without context", async () => {
      const transcript =
        "um so I was thinking that uh we should go to the store";
      const prompt = buildLocalizedPostProcessingPrompt({
        transcript: transcript,
        dictationLanguage: "en",
        toneTemplate: getDefaultStyle(),
        textFieldContext: null,
      });

      const result = await callLLM(prompt);

      // Should remove filler words but keep meaning
      expect(result.toLowerCase()).not.toContain("um");
      expect(result.toLowerCase()).not.toContain("uh");
      expect(result.toLowerCase()).toContain("store");

      // Should be reasonably similar to cleaned version
      console.log("Post-processed result:", result);
      expect(
        getStringSimilarity(
          result,
          "i was thinking that we should go to the store",
        ),
      ).toBeGreaterThan(0.8);
    }, 30000);
  });

  describe("with context (insertion at cursor)", () => {
    it("should format transcript for insertion context", async () => {
      const transcript = "Um hello how are you doing today";
      const context: TextFieldContext = {
        precedingText: "I was wondering,",
        selectedText: null,
        followingText: "Let me know.",
      };

      const prompt = buildLocalizedPostProcessingPrompt({
        transcript: transcript,
        dictationLanguage: "en",
        toneTemplate: getDefaultStyle(),
        textFieldContext: context,
      });

      const result = await callLLM(prompt);
      console.log("Post-processing result:", result);

      // Should be cleaned
      expect(result.toLowerCase()).not.toContain("um");

      // Should match the expected sentence (allow for punctuation variations)
      expect(
        getStringSimilarity(result, "hello, how are you doing today?"),
      ).toBeGreaterThan(0.8);

      expect(result.length).toBeGreaterThan(5);

      // Core meaning should be preserved
      expect(result.toLowerCase()).toContain("hello");
    }, 30000);
  });

  describe("with selection (replacement)", () => {
    it("should format transcript to replace selected text", async () => {
      const transcript = "um the quick brown fox";
      const context: TextFieldContext = {
        precedingText: "I saw",
        selectedText: "something interesting",
        followingText: "in the garden.",
      };

      const prompt = buildLocalizedPostProcessingPrompt({
        transcript: transcript,
        dictationLanguage: "en",
        toneTemplate: getDefaultStyle(),
        textFieldContext: context,
      });

      const result = await callLLM(prompt);

      // Should be cleaned
      expect(result.toLowerCase()).not.toContain("um");

      // Should match the expected sentence
      console.log("Post-processed result:", result);
      expect(
        getStringSimilarity(result, "the quick brown fox"),
      ).toBeGreaterThan(0.9);

      // Should contain the key content
      expect(result.toLowerCase()).toContain("fox");
    }, 30000);
  });

  it("should work for light tones", async () => {
    const tone = getDefaultSystemTones().find((t) => t.id === "light");

    const transcript = "um so I was thinking that uh we should go to the store";
    const prompt = buildLocalizedPostProcessingPrompt({
      transcript: transcript,
      dictationLanguage: "en",
      toneTemplate: tone?.promptTemplate || "",
      textFieldContext: null,
    });

    const result = await callLLM(prompt);

    // Should remove filler words but keep meaning
    expect(result.toLowerCase()).not.toContain("um");
    expect(result.toLowerCase()).not.toContain("uh");
    expect(result.toLowerCase()).toContain("store");

    // Should be reasonably similar to cleaned version
    console.log("Post-processed result:", result);
    expect(
      getStringSimilarity(
        result,
        "So I was thinking that we should go to the store.",
      ),
    ).toBeGreaterThan(0.9);
  });

  it("should work for casual tones", async () => {
    const tone = getDefaultSystemTones().find((t) => t.id === "casual");

    const transcript = "um so I was thinking that uh we should go to the store";
    const prompt = buildLocalizedPostProcessingPrompt({
      transcript: transcript,
      dictationLanguage: "en",
      toneTemplate: tone?.promptTemplate || "",
      textFieldContext: null,
    });

    const result = await callLLM(prompt);

    // Should remove filler words but keep meaning
    expect(result.toLowerCase()).not.toContain("um");
    expect(result.toLowerCase()).not.toContain("uh");
    expect(result.toLowerCase()).toContain("store");

    // Should be reasonably similar to cleaned version
    console.log("Post-processed result:", result);
    expect(
      getStringSimilarity(result, "I was thinking we should go to the store"),
    ).toBeGreaterThan(0.8);
  });

  it("should work for business tones", async () => {
    const tone = getDefaultSystemTones().find((t) => t.id === "business");

    const transcript =
      "um so yeah I was sort of thinking that uh we should go to the store";
    const prompt = buildLocalizedPostProcessingPrompt({
      transcript: transcript,
      dictationLanguage: "en",
      toneTemplate: tone?.promptTemplate || "",
      textFieldContext: null,
    });

    const result = await callLLM(prompt);

    // Should remove filler words but keep meaning
    expect(result.toLowerCase()).not.toContain("um");
    expect(result.toLowerCase()).not.toContain("uh");
    expect(result.toLowerCase()).toContain("store");

    // Should be reasonably similar to cleaned version
    console.log("Post-processed result:", result);
    expect(
      getStringSimilarity(result, "I was thinking we should go to the store."),
    ).toBeGreaterThan(0.8);
  });

  it("should put it in the requested language", async () => {
    const transcript = "um so I was thinking that uh we should go to the store";
    const prompt = buildLocalizedPostProcessingPrompt({
      transcript: transcript,
      dictationLanguage: "es",
      toneTemplate: getDefaultStyle(),
      textFieldContext: null,
    });

    const result = await callLLM(prompt);

    // Should remove filler words but keep meaning
    expect(result.toLowerCase()).not.toContain("um");
    expect(result.toLowerCase()).not.toContain("uh");
    expect(result.toLowerCase()).toContain("tienda");

    // Should be reasonably similar to cleaned version in Spanish
    console.log("Post-processed result:", result);
    expect(
      getStringSimilarity(
        result,
        "así que estaba pensando que deberíamos ir a la tienda",
      ),
    ).toBeGreaterThan(0.6);
  });

  it("should format it as an email", async () => {
    const transcript =
      "Hey Bob. um I wanted to check in about the report. uh let me know when you have it ready. Thanks Tom";
    const prompt = buildLocalizedPostProcessingPrompt({
      transcript: transcript,
      dictationLanguage: "en",
      toneTemplate: getDefaultStyle(),
      textFieldContext: null,
    });

    const result = await callLLM(prompt);

    // Should remove filler words but keep meaning
    expect(result.toLowerCase()).not.toContain("um");
    expect(result.toLowerCase()).not.toContain("uh");
    expect(result.toLowerCase()).toContain("report");

    // Should be reasonably similar to cleaned version in email format
    console.log("Post-processed result:", result);
    expect(
      getStringSimilarity(
        result,
        "Hey Bob,\n\nI wanted to check in about the report. Let me know when you have it ready.\n\nThanks,\nTom",
      ),
    ).toBeGreaterThan(0.8);
  });

  it("should format bullet points", async () => {
    const transcript =
      "ok so we need to do a few things. 1, fix the barcode. 2, fix the screen. Three, fix the login issue.";
    const prompt = buildLocalizedPostProcessingPrompt({
      transcript: transcript,
      dictationLanguage: "en",
      toneTemplate: getDefaultStyle(),
      textFieldContext: null,
    });

    const result = await callLLM(prompt);

    // Should remove filler words but keep meaning
    expect(result.toLowerCase()).not.toContain("um");
    expect(result.toLowerCase()).not.toContain("uh");
    expect(result.toLowerCase()).toContain("fix the barcode");

    // Should be reasonably similar to cleaned version in bullet point format
    console.log("Post-processed result:", result);
    expect(
      getStringSimilarity(
        result,
        "We need to do a few things:\n\n1. Fix the barcode.\n2. Fix the screen.\n3. Fix the login issue.",
      ),
    ).toBeGreaterThan(0.8);
  });
});
