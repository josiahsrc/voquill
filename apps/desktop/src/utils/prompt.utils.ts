import z from "zod";
import zodToJsonSchema from "zod-to-json-schema";
import { Locale } from "../i18n/config";
import { getIntl } from "../i18n/intl";
import { AppState } from "../state/app.state";
import {
  getDisplayNameForLanguage,
  LANGUAGE_DISPLAY_NAMES,
} from "./language.utils";

const sanitizeGlossaryValue = (value: string): string =>
  // oxlint-disable-next-line no-control-regex
  value.replace(/\0/g, "").replace(/\s+/g, " ").trim();

export const collectDictionaryEntries = (
  state: AppState,
): DictionaryEntries => {
  const sources = new Map<string, string>();
  const replacements = new Map<string, ReplacementRule>();

  const recordSource = (candidate: string): string | null => {
    const sanitized = sanitizeGlossaryValue(candidate);
    if (!sanitized) {
      return null;
    }

    const key = sanitized.toLowerCase();
    if (!sources.has(key)) {
      sources.set(key, sanitized);
    }

    return sources.get(key) ?? sanitized;
  };

  const recordReplacement = (source: string, destination: string) => {
    const sanitizedSource = recordSource(source);
    const sanitizedDestination = sanitizeGlossaryValue(destination);

    if (!sanitizedSource || !sanitizedDestination) {
      return;
    }

    const key = `${sanitizedSource.toLowerCase()}→${sanitizedDestination.toLowerCase()}`;
    if (!replacements.has(key)) {
      replacements.set(key, {
        source: sanitizedSource,
        destination: sanitizedDestination,
      });
    }
  };

  for (const termId of state.dictionary.termIds) {
    const term = state.termById[termId];
    if (!term) {
      continue;
    }

    if (term.isReplacement) {
      recordReplacement(term.sourceValue, term.destinationValue);
    } else {
      recordSource(term.sourceValue);
    }
  }

  return {
    sources: Array.from(sources.values()),
    replacements: Array.from(replacements.values()),
  };
};

type ReplacementRule = {
  source: string;
  destination: string;
};

export type DictionaryEntries = {
  sources: string[];
  replacements: ReplacementRule[];
};

export const buildLocalizedTranscriptionPrompt = (
  entries: DictionaryEntries,
): string => {
  const parts: string[] = [];
  const effectiveEntries = ["Voquill", ...entries.sources];
  parts.push(`Glossary: ${effectiveEntries.join(", ")}`);
  parts.push(
    `Consider this glossary when transcribing. Do not mention these rules; simply return the cleaned transcript.`,
  );
  return parts.join("\n");
};

export const buildSystemPostProcessingTonePrompt = (): string => {
  return "You are a transcript rewriting assistant. You modify the style and tone of the transcript while keeping the subject matter the same.";
};

export const buildPostProcessingPrompt = ({
  transcript,
  dictationLanguage,
  userName,
  toneTemplate,
}: {
  transcript: string;
  userName: string;
  dictationLanguage: string;
  toneTemplate: string;
}): string => {
  const languageName = getDisplayNameForLanguage(dictationLanguage);

  return `
Your task is to post-process a transcription.

Context:
- The speaker's name is ${userName}.
- The speaker wants the processed transcription to be in the ${languageName} language.

Instructions:
\`\`\`
${toneTemplate}
\`\`\`

Here is the transcript that you need to process:
\`\`\`
${transcript}
\`\`\`

Your response MUST be in JSON format.

Post-process transcription according to the instructions.
`;
};

export const PROCESSED_TRANSCRIPTION_SCHEMA = z.object({
  processedTranscription: z
    .string()
    .describe(
      "The processed version of the transcript. Empty if no transcript.",
    ),
});

export const PROCESSED_TRANSCRIPTION_JSON_SCHEMA =
  zodToJsonSchema(PROCESSED_TRANSCRIPTION_SCHEMA, "Schema").definitions
    ?.Schema ?? {};

export const buildSystemAgentPrompt = (): string => {
  return "You are a helpful AI assistant that executes user commands. The user will dictate instructions via voice, and you will execute those instructions and return the output. Your job is to understand what the user wants and produce it. Examples: 'write a poem about cats' → write the poem; 'summarize this article' → provide the summary; 'create a shopping list' → create the list; 'draft an email to my boss' → draft the email. Always return just the requested output, ready to be pasted.";
};

export const buildLocalizedAgentPrompt = (
  transcript: string,
  locale: Locale,
  toneTemplate?: string | null,
): string => {
  const intl = getIntl(locale);
  const languageName = LANGUAGE_DISPLAY_NAMES[locale];

  // Use tone template if provided to adjust the agent's response style
  let base: string;
  if (toneTemplate) {
    base = `
The user has dictated the following command or request. Follow it precisely.

Style instructions to apply to your response:
\`\`\`
${toneTemplate}
\`\`\`

Here is what the user dictated:
-------
${transcript}
-------

Execute the command and provide your response in ${languageName}.
`;
    console.log(
      "[Agent Prompt] Using tone template, result length:",
      base.length,
    );
  } else {
    console.log("[Agent Prompt] Using default prompt (no tone template)");
    base = intl.formatMessage(
      {
        defaultMessage: `
The user has dictated the following command:
-------
{transcript}
-------

Execute this command and provide the output in {languageName}.

Instructions:
- If the user asks you to write, create, draft, or compose something → produce that content
- If the user asks you to summarize, analyze, or explain something → provide the summary/analysis/explanation
- If the user asks you to transform or rewrite something → apply the transformation
- If the user provides a statement without a clear command → clean it up and present it clearly

Return ONLY the requested output, nothing else. The output will be pasted directly into the user's application.
        `,
      },
      {
        languageName,
        transcript,
      },
    );
  }

  console.log("Agent prompt", prompt);
  return base;
};
