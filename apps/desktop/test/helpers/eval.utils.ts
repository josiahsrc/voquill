import { expect } from "vitest";
import { z } from "zod";
import { zodToJsonSchema } from "zod-to-json-schema";
import {
  BaseGenerateTextRepo,
  GroqGenerateTextRepo,
} from "../../src/repos/generate-text.repo";
import { getGroqApiKey } from "./env.utils";

export type Eval = {
  criteria: string;
  acceptanceScore: number;
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
    ).toBeGreaterThanOrEqual(e.acceptanceScore);
  });

  await Promise.all(promises);
}
