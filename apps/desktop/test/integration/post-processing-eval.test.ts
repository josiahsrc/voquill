import { describe, test, vi } from "vitest";
import {
  buildLocalizedPostProcessingPrompt,
  buildSystemPostProcessingTonePrompt,
  PROCESSED_TRANSCRIPTION_JSON_SCHEMA,
  PROCESSED_TRANSCRIPTION_SCHEMA,
} from "../../src/utils/prompt.utils";
import { getDefaultSystemTones } from "../../src/utils/tone.utils";
import { Eval, getGentextRepo, runEval } from "../helpers/eval.utils";

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

const getWritingStyle = (style: string) => {
  const tones = getDefaultSystemTones();
  const tone = tones.find((t) => t.id === style);
  if (!tone) {
    throw new Error(`Writing style '${style}' not found`);
  }

  return tone.promptTemplate;
};

const postProcess = async ({
  tone,
  transcription,
  language = "en",
  userName = "Thomas Gundan",
}: {
  tone: string;
  transcription: string;
  language?: string;
  userName?: string;
}): Promise<string> => {
  const ppSystem = buildSystemPostProcessingTonePrompt();
  const ppPrompt = buildLocalizedPostProcessingPrompt({
    transcript: transcription,
    dictationLanguage: language,
    toneTemplate: tone,
    userName,
  });

  const output = await getGentextRepo().generateText({
    system: ppSystem,
    prompt: ppPrompt,
    jsonResponse: {
      name: "transcription_cleaning",
      description: "JSON response with the processed transcription",
      schema: PROCESSED_TRANSCRIPTION_JSON_SCHEMA,
    },
  });

  const parsed = PROCESSED_TRANSCRIPTION_SCHEMA.parse(JSON.parse(output.text));
  return parsed.processedTranscription;
};

const runPostProcessingEval = async ({
  transcription,
  language,
  userName,
  tone,
  evals,
}: {
  transcription: string;
  language?: string;
  userName?: string;
  tone: string;
  evals: Eval[];
}): Promise<void> => {
  const finalText = await postProcess({
    tone,
    transcription,
    language,
    userName,
  });

  await runEval({
    originalText: transcription,
    finalText,
    evals,
  });
};

describe("default style", () => {
  test("basic transcription1", async () => {
    await runPostProcessingEval({
      transcription: "Hello world",
      tone: getWritingStyle("default"),
      evals: [
        {
          criteria: "It shouldn't really change anything",
          acceptanceScore: 8,
        },
      ],
    });
  });

  test("basic transcription2", async () => {
    await runPostProcessingEval({
      transcription:
        "Hey douglas, I... uh.... wanted to check in about that the meeting tomorrow at 10am, no actually 4pm. Let me know if that still works for you.",
      tone: getWritingStyle("default"),
      evals: [
        {
          criteria: "It should remove fill words and false starts",
          acceptanceScore: 8,
        },
        {
          criteria: "It should auto correct the time to 4pm without mentioning 10am",
          acceptanceScore: 8,
        },
      ],
    });
  });

  test("coding transcription1", async () => {
    await runPostProcessingEval({
      transcription: `
Hey, can you implement eval.utils.ts? Maybe inside of there, I'll also just create a method called getGentextRepo. For now, that's just going to return grok, but it should return the base repo as the interface. So let's do that first.`,
      tone: getWritingStyle("default"),
      evals: [
        {
          criteria:
            "It should put backticks around coding terms like eval.utils.ts and getGentextRepo",
          acceptanceScore: 8,
        },
        {
          criteria: "It should fix grammar and improve readability",
          acceptanceScore: 8,
        },
      ],
    });
  });
});
