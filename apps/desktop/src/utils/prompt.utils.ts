import { IntlShape } from "react-intl";
import { Locale } from "../i18n/config";
import { getIntl } from "../i18n/intl";
import { AppState } from "../state/app.state";
import { LANGUAGE_DISPLAY_NAMES } from "./language.utils";
import z from "zod";
import zodToJsonSchema from "zod-to-json-schema";

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

export const buildLocalizedPostProcessingPrompt = (
  transcript: string,
  locale: Locale,
  toneTemplate?: string | null,
): string => {
  const intl = getIntl(locale);
  const languageName = LANGUAGE_DISPLAY_NAMES[locale];

  // Use tone template if provided, otherwise use default prompt
  let base: string;
  if (toneTemplate) {
    // Replace variables in tone template
    base = `
Process the transcript according to the following style instructions:

\`\`\`
${toneTemplate}
\`\`\`

Here is the transcript:
-------
${transcript}
-------

Your response must be in ${languageName}.
`;
    console.log("[Prompt] Using tone template, result length:", base.length);
  } else {
    // Default prompt (backward compatibility)
    console.log("[Prompt] Using default prompt (no tone template provided)");
    base = intl.formatMessage(
      {
        defaultMessage: `
Clean the {languageName} transcript below.
Remove only clear false starts, stutters, repeated sounds, and isolated filler words.
Do not remove any complete words, phrases, clauses, or sentences that contribute meaning, emotion, tone, emphasis, or intent.
Do not remove or shorten any part of the transcript unless it is purely a disfluency and contains no meaningful content on its own.
Do not delete or compress multiple words into fewer words.
Do not alter or reorganize the original wording, structure, or flow beyond removing those disfluencies.

Here is the transcript:
{transcript}
        `,
      },
      {
        languageName,
        transcript,
      },
    );
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
