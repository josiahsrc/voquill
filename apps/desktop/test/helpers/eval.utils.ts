import { expect } from "vitest";
import { z } from "zod";
import { zodToJsonSchema } from "zod-to-json-schema";
import {
  BaseGenerateTextRepo,
  GroqGenerateTextRepo,
} from "../../src/repos/generate-text.repo";
import {
  buildPostProcessingPrompt,
  buildSystemPostProcessingTonePrompt,
  PROCESSED_TRANSCRIPTION_JSON_SCHEMA,
  PROCESSED_TRANSCRIPTION_SCHEMA,
} from "../../src/utils/prompt.utils";
import { getDefaultSystemTones } from "../../src/utils/tone.utils";
import { getGroqApiKey } from "./env.utils";

export type Eval = {
  criteria: string;
};

const EVAL_RESULT_SCHEMA = z.object({
  score: z.number().min(0).max(10),
  reason: z.string(),
});

const EVAL_RESULT_JSON_SCHEMA =
  zodToJsonSchema(EVAL_RESULT_SCHEMA, "Schema").definitions?.Schema ?? {};

export function getGentextRepo(): BaseGenerateTextRepo {
  const apiKey = getGroqApiKey();
  return new GroqGenerateTextRepo(apiKey, "openai/gpt-oss-120b");
}

export async function runEval({
  originalText,
  finalText,
  evals,
}: {
  originalText: string;
  finalText: string;
  evals: Eval[];
}): Promise<void> {
  originalText = originalText.trim();
  finalText = finalText.trim();

  const repo = getGentextRepo();
  console.log("Orig Text:", originalText);
  console.log("Finl Text:", finalText);

  // for (const e of evals) {
  const promises = evals.map(async (e) => {
    const output = await repo.generateText({
      system:
        "You are an evaluator. Score the final text based on the given criteria. Return a score between 0 and 10 and a reason for your score.",
      prompt: [
        `Original text: ${originalText}`,
        `Final text: ${finalText}`,
        `Criteria: ${e.criteria}`,
      ].join("\n\n"),
      jsonResponse: {
        name: "eval_result",
        description: "Evaluation score and reason",
        schema: EVAL_RESULT_JSON_SCHEMA,
      },
    });

    const result = EVAL_RESULT_SCHEMA.parse(JSON.parse(output.text));

    console.log(`Eval Result for criteria "${e.criteria}":`, result);
    expect(
      result.score,
      `Eval failed for "${e.criteria}": ${result.reason}`,
    ).toBeGreaterThanOrEqual(5);
  });

  await Promise.all(promises);
}

export const postProcess = async ({
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
  const ppPrompt = buildPostProcessingPrompt({
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

export const getWritingStyle = (style: string) => {
  const tones = getDefaultSystemTones();
  const tone = tones.find((t) => t.id === style);
  if (!tone) {
    throw new Error(`Writing style '${style}' not found`);
  }

  return tone.promptTemplate;
};
