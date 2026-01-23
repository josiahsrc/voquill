import z from "zod";
import zodToJsonSchema from "zod-to-json-schema";
import { Locale } from "../i18n/config";
import { getIntl } from "../i18n/intl";
import { AppState } from "../state/app.state";
import type { TextFieldContext } from "./accessibility.utils";
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

const buildDictionaryContext = (entries: DictionaryEntries): string | null => {
  const sections: string[] = [`Glossary: ${entries.sources.join(", ")}`];

  if (entries.replacements.length > 0) {
    const formattedRules = entries.replacements
      .map(({ source, destination }) => `- ${source} -> ${destination}`)
      .join("\n");

    sections.push(
      `Apply these replacement rules exactly before returning the transcript:\n${formattedRules}\nEvery occurrence of the source phrase must appear in the final transcript as the destination value.`,
    );
  }

  if (sections.length === 0) {
    return null;
  }

  sections.push(
    `Do not mention these rules; simply return the cleaned transcript.`,
  );

  return `Dictionary context for editing:\n${sections.join("\n\n")}`;
};

export const buildLocalizedTranscriptionPrompt = (
  entries: DictionaryEntries,
): string => {
  return buildDictionaryContext(entries) ?? "";
};

export const buildSystemPostProcessingTonePrompt = (): string => {
  return "You are a transcript rewriting assistant. You modify the style and tone of the transcript while keeping the subject matter the same.";
};

const ifNotEnglish = (languageCode: string, prompt: string): string => {
  if (languageCode === "en") {
    return "";
  }
  return ` ${prompt}`;
};

const buildStyleSection = (toneTemplate: string | null | undefined): string => {
  if (!toneTemplate) {
    return `
STYLE INSTRUCTIONS:
Do not modify the style or tone of the transcript. Focus solely on fixing grammar mistakes and punctuation errors without changing the speaker's original tone or intent.
    `;
  }

  return `
STYLE INSTRUCTIONS:
Apply the following writing style to your output:
\`\`\`
${toneTemplate}
\`\`\`
`;
};

const FORMATTING_RULES = `
FORMATTING RULES (MUST APPLY):

EMAIL FORMAT:
When the transcript contains a greeting followed by a proper noun (hi/hey/hello/dear + name) OR ends with a sign-off followed by a proper noun (thanks/thank you/best/cheers/sincerely/regards + name), format as an email. Place the greeting on its own line followed by a comma, separate body content into paragraphs with blank lines between them, and place the sign-off on its own line followed by a comma with the sender name on the next line.

LIST FORMAT:
Format as a list when the transcript contains three or more distinct items of the same category or type. Detect lists by identifying parallel structures where items are separated by conjunctions, pauses, or transitions. Use numbered format (1. 2. 3.) when the speaker used ordinal or cardinal enumeration words, or when the items represent sequential steps or a ranked order. Use bulleted format (- item) for all other lists where items are parallel but order is not significant. Place each item on its own line. Remove enumeration words and connective words between items.

DEFAULT FORMAT:
When no email or list patterns are detected, output as flowing prose. Insert paragraph breaks at natural topic transitions.
`;

export const buildLocalizedPostProcessingPrompt = ({
  transcript,
  dictationLanguage,
  toneTemplate,
  textFieldContext,
}: {
  transcript: string;
  dictationLanguage: string;
  toneTemplate?: string | null;
  textFieldContext?: TextFieldContext | null;
}): string => {
  const languageName = getDisplayNameForLanguage(dictationLanguage);
  const hasContext = textFieldContext != null;
  const hasSelection =
    textFieldContext?.selectedText &&
    textFieldContext.selectedText.trim().length > 0;

  const styleSection = buildStyleSection(toneTemplate);
  let base: string;

  if (hasSelection) {
    // When replacing selected text, use the transcript content, fitted to boundaries
    base = `You are a dictation assistant. Output ONLY the text that should replace the user's selected text.

INPUTS:
- Text before (immediately preceding selection): "${textFieldContext.precedingText ?? ""}"
- Text after (immediately following selection): "${textFieldContext.followingText ?? ""}"
- Selected text (being replaced): "${textFieldContext.selectedText}"
- User dictation: "${transcript}"

TASK: Rewrite the user dictation so it fits seamlessly between "Text before" and "Text after".
${styleSection}
${FORMATTING_RULES}
RULES (must follow):
1. Use only the user's dictation words. Do not add new words or reintroduce words from the selected text unless they also appear in the dictation.
2. Remove only speech disfluencies (e.g., "um", "uh", stutters, false starts). Keep all meaningful words.
3. Boundary deduplication:
   - If the last 1-6 words of your output would duplicate the first 1-6 words of "Text after", remove those duplicated words from your output.
   - If the first 1-6 words of your output would duplicate the last 1-6 words of "Text before", remove those duplicated words from your output.
4. Casing:
   - If "Text before" ends with a sentence boundary (. ? !) or is empty, start with a capital letter.
   - Otherwise, start with lowercase (unless the first word is a proper noun or "I").
5. Punctuation:
   - Do not end with punctuation that makes the combined text ungrammatical.
   - Use a comma if "Text after" continues the same sentence; use a period/question mark only if appropriate.
6. Output must be plain text with no quotes, labels, or extra commentary.

Your response MUST be in ${languageName}.${ifNotEnglish(dictationLanguage, "DO NOT translate to English or any other language.")} Return only the replacement text.`;
  } else if (hasContext) {
    // Inserting at cursor without selection
    base = `You are cleaning dictated text that will be inserted into an existing document.

SURROUNDING CONTEXT (for capitalization reference only):
${textFieldContext.precedingText ? `Text before cursor: "${textFieldContext.precedingText}"` : "Start of document"}
${textFieldContext.followingText ? `Text after cursor: "${textFieldContext.followingText}"` : "End of document"}

TRANSCRIPT TO CLEAN:
${transcript}
${styleSection}
${FORMATTING_RULES}
INSTRUCTIONS:
1. Remove filler words (um, uh, like, you know, so, basically, actually, I mean) and speech disfluencies (stutters, false starts, repeated words)
2. Preserve all meaningful content from the transcript
3. Adjust capitalization based on whether text before cursor ends with sentence-ending punctuation
4. Apply the formatting rules above to detect and format emails and lists

CRITICAL: Your output must contain ONLY the cleaned transcript. Never include the "text before cursor" or "text after cursor" in your output. Those are provided solely for capitalization context.

Return ONLY the cleaned transcript in ${languageName}.${ifNotEnglish(dictationLanguage, "Do not translate to English.")}`;
  } else {
    // No context - just clean the transcript
    base = `Clean and format the ${languageName} transcript below.
${styleSection}
${FORMATTING_RULES}
CLEANING RULES:
- Remove filler words (um, uh, like, you know, so, basically, actually, I mean) and speech disfluencies (stutters, false starts, repeated words)
- Preserve all meaningful content
- Apply the formatting rules above to detect and format emails and lists

Here is the transcript:
-------
${transcript}
-------

Your response MUST be in ${languageName}.${ifNotEnglish(dictationLanguage, "Do not translate to English.")}`;
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
