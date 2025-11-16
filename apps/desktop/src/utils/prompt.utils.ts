import { IntlShape } from "react-intl";
import { Locale } from "../i18n/config";
import { getIntl } from "../i18n/intl";
import { AppState } from "../state/app.state";
import { LANGUAGE_DISPLAY_NAMES } from "./language.utils";

const sanitizeGlossaryValue = (value: string): string =>
  value.replace(/\0/g, "").replace(/\s+/g, " ").trim();

export const collectDictionaryEntries = (
  state: AppState
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

type DictionaryEntries = {
  sources: string[];
  replacements: ReplacementRule[];
};

const buildDictionaryContext = (
  entries: DictionaryEntries,
  intl: IntlShape
): string | null => {
  const sections: string[] = [];

  if (entries.sources.length > 0) {
    sections.push(
      intl.formatMessage(
        {
          defaultMessage: "Glossary: {terms}",
        },
        {
          terms: entries.sources.join(", "),
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

export const buildSystemPostProcessingTonePrompt = (
  locale: Locale,
): string => {
  const intl = getIntl(locale);
  return intl.formatMessage(
    {
      defaultMessage:
        "You post-process transcripts, modifying the transcript based on the user's request.",
    },
    {},
  );
}

export const buildLocalizedPostProcessingPrompt = (
  transcript: string,
  locale: Locale,
  toneTemplate?: string | null,
): string => {
  const intl = getIntl(locale);
  const languageName = LANGUAGE_DISPLAY_NAMES[locale];

  console.log("[Prompt] Building post-processing prompt with tone:", {
    hasToneTemplate: !!toneTemplate,
    toneTemplateLength: toneTemplate?.length,
  });

  // Use tone template if provided, otherwise use default prompt
  let base: string;
  if (toneTemplate) {
    // Replace variables in tone template
    base = toneTemplate
      .replace(/\{transcript\}/g, transcript)
      .replace(/\{languageName\}/g, languageName);

    console.log("[Prompt] Using tone template, result length:", base.length);
  } else {
    // Default prompt (backward compatibility)
    console.log("[Prompt] Using default prompt (no tone template provided)");
    base = intl.formatMessage(
      {
        defaultMessage:
          "You are Voquill. Clean the {languageName} transcript below. Remove filler words, false starts, repetitions, and disfluencies. Fix grammar and structure without rephrasing or embellishing, and preserve the speaker's tone exactly. Do not add notes or extra content. Always preserve meaningful input. Never return an empty result unless the input is truly empty.\n\nHere is the transcript:\n-------\n{transcript}\n-------\n\nReturn only the cleaned version.",
      },
      {
        languageName,
        transcript,
      },
    );
  }

  return base;
};

export type { DictionaryEntries };
