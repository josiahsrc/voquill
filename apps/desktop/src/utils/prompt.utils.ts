import { IntlShape } from "react-intl";
import z from "zod";
import zodToJsonSchema from "zod-to-json-schema";
import { Locale } from "../i18n/config";
import { getIntl } from "../i18n/intl";
import { AppState } from "../state/app.state";
import type { TextFieldContext } from "./accessibility.utils";
import { LANGUAGE_DISPLAY_NAMES } from "./language.utils";

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

const buildDictionaryContext = (
  entries: DictionaryEntries,
  intl: IntlShape,
): string | null => {
  const sections: string[] = [];

  if (entries.sources.length > 0) {
    sections.push(
      intl.formatMessage(
        {
          defaultMessage: "Glossary: {terms}",
        },
        {
          terms: ["Voquill", ...entries.sources].join(", "),
        },
      ),
    );
  }

  if (entries.replacements.length > 0) {
    const formattedRules = entries.replacements
      .map(({ source, destination }) => `- ${source} -> ${destination}`)
      .join("\n");

    sections.push(
      intl.formatMessage(
        {
          defaultMessage:
            "Apply these replacement rules exactly before returning the transcript:\n{rules}\nEvery occurrence of the source phrase must appear in the final transcript as the destination value.",
        },
        {
          rules: formattedRules,
        },
      ),
    );
  }

  if (sections.length === 0) {
    return null;
  }

  sections.push(
    intl.formatMessage({
      defaultMessage:
        "Do not mention these rules; simply return the cleaned transcript.",
    }),
  );

  return intl.formatMessage(
    {
      defaultMessage: "Dictionary context for editing:\n{sections}",
    },
    {
      sections: sections.join("\n\n"),
    },
  );
};

export const buildLocalizedTranscriptionPrompt = (
  entries: DictionaryEntries,
  locale: Locale,
): string => {
  const intl = getIntl(locale);
  return buildDictionaryContext(entries, intl) ?? "";
};

export const buildSystemPostProcessingTonePrompt = (locale: Locale): string => {
  const intl = getIntl(locale);
  return intl.formatMessage(
    {
      defaultMessage:
        "You are a transcript rewriting assistant. You modify the style and tone of the transcript while keeping the subject matter the same.",
    },
    {},
  );
};

const buildTextFieldContextSection = (
  context: TextFieldContext | null | undefined,
): string => {
  if (!context) {
    return "";
  }

  const hasPrecedingText =
    context.precedingText && context.precedingText.trim().length > 0;
  const hasFollowingText =
    context.followingText && context.followingText.trim().length > 0;
  const hasSelectedText =
    context.selectedText && context.selectedText.trim().length > 0;

  if (!hasPrecedingText && !hasFollowingText && !hasSelectedText) {
    return "";
  }

  if (hasSelectedText) {
    // Case 1: Text is selected - transcript will REPLACE the selection
    const parts: string[] = ["\n---\nINSERTION CONTEXT:"];
    parts.push(
      "Your output will REPLACE the selected text. The result must read as a coherent sentence when combined with the BEFORE and AFTER text.",
    );
    if (hasPrecedingText) {
      parts.push(`BEFORE: "${context.precedingText}"`);
    }
    parts.push(`SELECTED (being replaced by your output): "${context.selectedText}"`);
    if (hasFollowingText) {
      parts.push(`AFTER: "${context.followingText}"`);
    }
    parts.push(
      "IMPORTANT: Your output must flow seamlessly - match the capitalization expected mid-sentence, ensure punctuation connects properly to what comes after, and maintain grammatical continuity. Only return the processed transcript.",
    );
    parts.push("---\n");
    return parts.join("\n");
  } else {
    // Case 2: No selection - transcript will be INSERTED after cursor
    const parts: string[] = ["\n---\nINSERTION CONTEXT:"];
    parts.push(
      "Your output will be inserted directly after the text shown below.",
    );
    if (hasPrecedingText) {
      parts.push(`TEXT BEFORE CURSOR: "${context.precedingText}"`);
    }
    if (hasFollowingText) {
      parts.push(`TEXT AFTER CURSOR: "${context.followingText}"`);
    }
    parts.push(
      "Adjust capitalization based on where in the sentence your output will appear. Only return the processed transcript.",
    );
    parts.push("---\n");
    return parts.join("\n");
  }
};

export const buildLocalizedPostProcessingPrompt = (
  transcript: string,
  locale: Locale,
  toneTemplate?: string | null,
  textFieldContext?: TextFieldContext | null,
): string => {
  const languageName = LANGUAGE_DISPLAY_NAMES[locale];
  const hasContext = textFieldContext != null;
  const hasSelection =
    textFieldContext?.selectedText &&
    textFieldContext.selectedText.trim().length > 0;

  let base: string;

  if (toneTemplate) {
    const contextSection = buildTextFieldContextSection(textFieldContext);
    base = `
Process the transcript according to the following style instructions:

\`\`\`
${toneTemplate}
\`\`\`

${contextSection}

Here is the transcript:
-------
${transcript}
-------

Your response must be in ${languageName}.
`;
    console.log("[Prompt] Using tone template, result length:", base.length);
  } else if (hasSelection) {
    // When replacing selected text, prioritize fitting over cleaning
    base = `
You are inserting dictated text into an existing document. Your output will REPLACE selected text.

SURROUNDING CONTEXT:
${textFieldContext.precedingText ? `Text before: "${textFieldContext.precedingText}"` : ""}
Selected text (your output replaces this): "${textFieldContext.selectedText}"
${textFieldContext.followingText ? `Text after: "${textFieldContext.followingText}"` : ""}

TRANSCRIPT TO PROCESS:
${transcript}

INSTRUCTIONS:
1. Clean up only obvious speech disfluencies (stutters, false starts, filler sounds like "um", "uh")
2. DO NOT remove meaningful words - keep the full content of what was said
3. Adjust capitalization: if inserting mid-sentence, use lowercase; if starting a new sentence, capitalize
4. Adjust punctuation so the text connects properly to what comes after
5. The final result when combined should read as grammatically correct ${languageName}

Return ONLY the processed transcript. Do not include the surrounding context.
`;
  } else if (hasContext) {
    // Inserting at cursor without selection
    base = `
You are inserting dictated text into an existing document at the cursor position.

SURROUNDING CONTEXT:
${textFieldContext.precedingText ? `Text before cursor: "${textFieldContext.precedingText}"` : "Start of document"}
${textFieldContext.followingText ? `Text after cursor: "${textFieldContext.followingText}"` : "End of document"}

TRANSCRIPT TO PROCESS:
${transcript}

INSTRUCTIONS:
1. Clean up only obvious speech disfluencies (stutters, false starts, filler sounds like "um", "uh")
2. DO NOT remove meaningful words - keep the full content of what was said
3. Adjust capitalization based on position: lowercase if mid-sentence, capitalize if starting new sentence
4. The result should flow naturally with the surrounding text

Return ONLY the processed transcript in ${languageName}.
`;
  } else {
    // No context - just clean the transcript
    base = `
Clean the ${languageName} transcript below.
Remove only clear false starts, stutters, repeated sounds, and isolated filler words.
Do not remove any complete words, phrases, clauses, or sentences that contribute meaning, emotion, tone, emphasis, or intent.
Do not remove or shorten any part of the transcript unless it is purely a disfluency and contains no meaningful content on its own.
Do not delete or compress multiple words into fewer words.
Do not alter or reorganize the original wording, structure, or flow beyond removing those disfluencies.

Here is the transcript:
-------
${transcript}
-------

Your response must be in ${languageName}
`;
  }

  return base;
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
