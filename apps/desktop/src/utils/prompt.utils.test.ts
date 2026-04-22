import { describe, expect, it } from "vitest";
import {
  buildDictationContext,
  buildPostProcessingPrompt,
  buildSystemPostProcessingTonePrompt,
  PostProcessingPromptInput,
} from "./prompt.utils";
import { StyleToneConfig, TemplateToneConfig } from "./tone.utils";

const makeInput = (
  tone: StyleToneConfig | TemplateToneConfig,
  overrides: Partial<Omit<PostProcessingPromptInput, "tone">> = {},
): PostProcessingPromptInput => ({
  transcript: "Hello world",
  userName: "Alice",
  dictationLanguage: "en",
  tone,
  ...overrides,
});

describe("buildDictationContext", () => {
  it("preserves replacement destinations in shared context assembly", () => {
    const result = buildDictationContext({
      dictationLanguage: "en",
      terms: [
        {
          sourceValue: "voquill",
          destinationValue: "Voquill",
          isReplacement: true,
        },
        {
          sourceValue: "GraphQL",
          destinationValue: "GraphQL",
          isReplacement: false,
        },
      ],
    });

    expect(result.glossaryTerms).toEqual(["voquill", "GraphQL"]);
    expect(result.replacementMap).toEqual({ voquill: "Voquill" });
  });

  it("preserves selected text and screen context in shared context assembly", () => {
    const result = buildDictationContext({
      dictationLanguage: "en",
      selectedText: "  Draft\0 summary \n section  ",
      screenContext: "\0Browser tab  \n product requirements  ",
    } as Parameters<typeof buildDictationContext>[0] & {
      selectedText: string;
      screenContext: string;
    });

    expect(result).toMatchObject({
      selectedText: "Draft summary section",
      screenContext: "Browser tab product requirements",
    });
  });
});

describe("buildSystemPostProcessingTonePrompt", () => {
  it("returns default system prompt for style config", () => {
    const result = buildSystemPostProcessingTonePrompt(
      makeInput({ kind: "style", stylePrompt: "Be formal" }),
    );
    expect(result).toContain("Be formal");
    expect(result).toContain("English");
  });

  it("returns custom system prompt for template config", () => {
    const result = buildSystemPostProcessingTonePrompt(
      makeInput({
        kind: "template",
        promptTemplate: "Process: <transcript/>",
        systemPromptTemplate: "You are a custom assistant for the enterprise.",
      }),
    );
    expect(result).toBe("You are a custom assistant for the enterprise.");
  });

  it("substitutes variables in template system prompt", () => {
    const result = buildSystemPostProcessingTonePrompt(
      makeInput(
        {
          kind: "template",
          promptTemplate: "ignored",
          systemPromptTemplate:
            "You assist <username/> with transcripts in <language/>.",
        },
        { userName: "Bob", dictationLanguage: "fr" },
      ),
    );
    expect(result).toBe("You assist Bob with transcripts in Français.");
  });

  it("falls back to default when template config has no systemPromptTemplate", () => {
    const result = buildSystemPostProcessingTonePrompt(
      makeInput({
        kind: "template",
        promptTemplate: "Process: <transcript/>",
      }),
    );
    expect(result).toContain("Clean up the provided transcript");
    expect(result).toContain("English");
  });

  it("includes app and editor context when available", () => {
    const result = buildSystemPostProcessingTonePrompt(
      makeInput(
        { kind: "style", stylePrompt: "Be formal" },
        {
          context: buildDictationContext({
            dictationLanguage: "en",
            currentApp: { id: "notes", name: "Notes" },
            currentEditor: { id: "body", name: "Document Body" },
            selectedText: "  Pending\0 launch \n notes  ",
            screenContext: "\0Browser tab  \n release dashboard  ",
          } as Parameters<typeof buildDictationContext>[0] & {
            selectedText: string;
            screenContext: string;
          }),
        },
      ),
    );

    expect(result).toContain("Current app: Notes");
    expect(result).toContain("Current editor: Document Body");
    expect(result).toContain("Selected text: Pending launch notes");
    expect(result).toContain("Screen context: Browser tab release dashboard");
  });
});

describe("buildPostProcessingPrompt", () => {
  it("substitutes variables in template config", () => {
    const result = buildPostProcessingPrompt(
      makeInput({
        kind: "template",
        promptTemplate:
          "User <username/> said: <transcript/>. Respond in <language/>.",
      }),
    );
    expect(result).toBe("User Alice said: Hello world. Respond in English.");
  });

  it("substitutes multiple occurrences of the same variable", () => {
    const result = buildPostProcessingPrompt(
      makeInput(
        {
          kind: "template",
          promptTemplate: "<username/> (<username/>) wrote: <transcript/>",
        },
        { transcript: "test", userName: "Bob", dictationLanguage: "fr" },
      ),
    );
    expect(result).toBe("Bob (Bob) wrote: test");
  });

  it("uses standard prompt structure for style config", () => {
    const result = buildPostProcessingPrompt(
      makeInput({ kind: "style", stylePrompt: "Be formal" }),
    );
    expect(result).toContain("<transcript>");
    expect(result).toContain("Hello world");
    expect(result).toContain(
      "Process the transcript according to the instructions",
    );
  });
});
