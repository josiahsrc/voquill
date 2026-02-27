import { Nullable, Tone } from "@repo/types";
import { getRec } from "@repo/utilities";
import { getIntl } from "../i18n/intl";
import { AppState } from "../state/app.state";
import { getEffectiveStylingMode } from "./feature.utils";
import { getMyUser, getMyUserPreferences } from "./user.utils";

export const CLEAN_TONE_ID = "default";
export const VERBATIM_TONE_ID = "verbatim";
export const EMAIL_TONE_ID = "email";
export const CHAT_TONE_ID = "chat";
export const FORMAL_TONE_ID = "formal";
export const DISABLED_TONE_ID = "disabled";

export const getDefaultSystemTones = (): Tone[] => {
  const intl = getIntl();

  return [
    {
      id: CLEAN_TONE_ID,
      name: intl.formatMessage({
        defaultMessage: "Polished",
      }),
      promptTemplate: `
- You are a transcript polisher. Convert raw spoken text into clean written text that the speaker would have written themselves.
- Remove filler words, stutters, false starts, and self-corrections. Keep only the final intended version of each thought. Interjections and exclamations that express emotion or reaction are not filler words — keep them.
- Convert spoken symbol cues to actual symbols: "hashtag [word]" or "pound sign [word]" becomes "#[word]", and "at [name]" or "at sign [name]" becomes "@[name]".
- Put backticks around code terms like filenames, function names, and code snippets.
- Format bulletted lists when the user speaks items in a list format
- Fix grammar, spelling, and punctuation.
- The words "new line", "newline", and "new paragraph" are formatting commands, not content. Replace them with an actual line break character. Never write the words "new line" or "newline" literally in the output.
- Convert spoken emoji descriptions into their actual emoji characters.
- Preserve the speaker's exact word choice, tone, sentence structure, and level of formality. Do not substitute, rephrase, or elevate their language.
- Do NOT add, infer, or hallucinate any information the speaker did not explicitly say.
- Output ONLY the polished text with no commentary.
      `.trim(),
      isSystem: true,
      createdAt: 0,
      sortOrder: 0,
    },
    {
      id: VERBATIM_TONE_ID,
      name: intl.formatMessage({
        defaultMessage: "Verbatim",
      }),
      promptTemplate: `
- Produce a near-exact transcription that preserves the speaker's voice
- Add punctuation, capitalization, and paragraph breaks for readability
- Format bulletted lists when the user speaks items in a list format
- Remove filler words (um, uh, like, you know), false starts, repeated words, and content the speaker later corrected
- Do NOT fix grammar, do NOT restructure sentences, and do NOT change the speaker's word choices or phrasing
- Convert spoken symbol cues to actual symbols: "hashtag [word]" or "pound sign [word]" becomes "#[word]", and "at [name]" or "at sign [name]" becomes "@[name]"
- Put backticks around code terms like filenames, function names, and code snippets
      `.trim(),
      isSystem: true,
      createdAt: 0,
      sortOrder: 1,
    },
    {
      id: EMAIL_TONE_ID,
      name: intl.formatMessage({
        defaultMessage: "Email",
      }),
      promptTemplate: `
- Format the output as an email: greeting line, body paragraphs, and a sign-off with the speaker's name. No subject line. Use newlines where appropriate.
- The greeting and sign-off should match the tone of what the speaker said. If they said their own greeting or sign-off, use their words. If they didn't, add a simple one that fits the tone.
- When the speaker lists multiple items, format them as a bulleted or numbered list.
- Format bulletted lists when the user speaks items in a list format
- Fix grammar, spelling, and punctuation.
- Preserve the speaker's word choice and tone. Do not rephrase, elevate, or formalize their language beyond what they said.
- Remove filler words, stutters, false starts, and self-corrections. Keep only the final intended version of each thought. Interjections and exclamations that express emotion or reaction are not filler words — keep them.
- Every idea and sentiment the speaker expressed must appear in the output. If the speaker said something blunt, awkward, or impolite, keep it. Your job is to format their words, not filter them.
- Do NOT add information, details, reasons, or context the speaker did not say.
      `.trim(),
      isSystem: true,
      createdAt: 0,
      sortOrder: 2,
    },
    {
      id: CHAT_TONE_ID,
      name: intl.formatMessage({
        defaultMessage: "Chat",
      }),
      promptTemplate: `
- You are formatting spoken words into a chat message. The speaker dictated this out loud — make it sound like them typing.
- Keep it casual and concise. Do not over-structure or over-punctuate.
- Format bulletted lists when the user speaks items in a list format
- Fix spelling and basic punctuation. Do not add exclamation points unless the speaker's tone clearly called for one. Default to periods.
- Preserve the speaker's word choice and tone. Do not rephrase, elevate, or formalize.
- Remove filler words, stutters, false starts, and self-corrections. Keep only the final intended version of each thought. Interjections and exclamations that express emotion or reaction are not filler words — keep them.
- Convert spoken formatting commands into actual formatting and spoken emoji descriptions into actual emoji characters.
- Every idea and sentiment the speaker expressed must appear in the output. If they said something blunt or impolite, keep it.
- Do NOT add greetings, sign-offs, information, or details the speaker did not say
      `.trim(),
      isSystem: true,
      createdAt: 0,
      sortOrder: 3,
    },
    {
      id: FORMAL_TONE_ID,
      name: intl.formatMessage({
        defaultMessage: "Formal",
      }),
      promptTemplate: `
- Rewrite in a polished, professional register
- Fix grammar, remove filler and disfluencies, and restructure for readability
- Keep the speaker's vocabulary, sentence patterns, while enforcing a formal tone
- Use complete sentences, precise vocabulary, and proper grammar
- Avoid contractions, colloquialisms, and casual phrasing
- It should remove content that was later corrected by the speaker
- The result should be suitable for official documents, proposals, or professional correspondence
- It is expected that the speaker's casual voice will be replaced with a formal tone that is confident
- Preserve all meaningful content and intent from the original transcript
      `.trim(),
      isSystem: true,
      createdAt: 0,
      sortOrder: 4,
    },
    {
      id: DISABLED_TONE_ID,
      name: intl.formatMessage({
        defaultMessage: "Disabled",
      }),
      promptTemplate: "Do not apply any post-processing to the transcription.",
      isSystem: true,
      createdAt: 0,
      sortOrder: 5,
      shouldDisablePostProcessing: true,
    },
    ...getDeprecatedSystemTones(),
  ];
};

const getDeprecatedSystemTones = (): Tone[] => {
  const intl = getIntl();

  return [
    {
      id: "light",
      name: intl.formatMessage({
        defaultMessage: "Light",
      }),
      promptTemplate: `
Make only surgical corrections that fix spelling, punctuation, or clear grammatical mistakes while keeping the speaker's sentences exactly as spoken.
Make the language vocal, clean, and free of filler while preserving the speaker's meaning. Remove filler words, false starts, repetitions, and disfluencies. Fix grammar and structure without embellishing, and preserve the speaker's tone exactly. Do not add notes or extra content. Always preserve meaningful input. Never return an empty result unless the input is truly empty.
Only apply light edits necessary for clarity and correctness.
        `,
      isSystem: true,
      createdAt: 0,
      sortOrder: 0,
      isDeprecated: true,
    },
    {
      id: "casual",
      name: intl.formatMessage({
        defaultMessage: "Casual",
      }),
      promptTemplate: `
The cleaned output should feel casual, vocal, and approachable—like a friendly conversation—while preserving the speaker's core message.
Make the language vocal, clean, and free of filler while preserving the speaker's meaning. Remove filler words, false starts, repetitions, and disfluencies. Fix grammar and structure without embellishing, and preserve the speaker's tone exactly. Do not add notes or extra content. Always preserve meaningful input. Never return an empty result unless the input is truly empty.
        `,
      isSystem: true,
      createdAt: 0,
      sortOrder: 1,
      isDeprecated: true,
    },
    {
      id: "formal",
      name: intl.formatMessage({
        defaultMessage: "Formal",
      }),
      promptTemplate: `
Deliver the result in a polished, formal register with precise grammar and professional language while keeping every idea from the speaker.
Make the language vocal, clean, and free of filler while preserving the speaker's meaning. Remove filler words, false starts, repetitions, and disfluencies. Fix grammar and structure without embellishing, and preserve the speaker's tone exactly. Do not add notes or extra content. Always preserve meaningful input. Never return an empty result unless the input is truly empty.
        `,
      isSystem: true,
      createdAt: 0,
      sortOrder: 2,
      isDeprecated: true,
    },
    {
      id: "business",
      name: intl.formatMessage({
        defaultMessage: "Business",
      }),
      promptTemplate: `
Return a concise, business-ready version that is direct, action-oriented, and focused on the key decisions or takeaways without losing meaning.
Make the language vocal, clean, and free of filler while preserving the speaker's meaning. Remove filler words, false starts, repetitions, and disfluencies. Fix grammar and structure without embellishing, and preserve the speaker's tone exactly. Do not add notes or extra content. Always preserve meaningful input. Never return an empty result unless the input is truly empty.
        `,
      isSystem: true,
      createdAt: 0,
      sortOrder: 3,
      isDeprecated: true,
    },
    {
      id: "punny",
      name: intl.formatMessage({
        defaultMessage: "Punny",
      }),
      promptTemplate: `
Inject clever puns and playful wordplay while keeping the original intent fully intact, and maintain the same level of polish as a clean transcript.
Make the language vocal, clean, and free of filler while preserving the speaker's meaning. Remove filler words, false starts, repetitions, and disfluencies. Fix grammar and structure without embellishing, and preserve the speaker's tone exactly. Do not add notes or extra content. Always preserve meaningful input. Never return an empty result unless the input is truly empty.
You must inject clever puns throughout the result.
        `,
      isSystem: true,
      createdAt: 0,
      sortOrder: 4,
      isDeprecated: true,
    },
  ];
};

export const getToneById = (
  state: AppState,
  id: Nullable<string>,
): Nullable<Tone> => {
  return getRec(state.toneById, id) ?? null;
};

export type TemplateToneConfig = {
  kind: "template";
  promptTemplate: string;
  systemPromptTemplate?: string;
};

export type StyleToneConfig = {
  kind: "style";
  stylePrompt: string;
};

export type ToneConfig = TemplateToneConfig | StyleToneConfig;

const toneToConfig = (tone: Tone): ToneConfig => {
  if (tone.isTemplateTone) {
    return {
      kind: "template",
      promptTemplate: tone.promptTemplate,
      systemPromptTemplate: tone.systemPromptTemplate,
    };
  }

  return {
    kind: "style",
    stylePrompt: tone.promptTemplate,
  };
};

export const getToneConfig = (
  state: AppState,
  id: Nullable<string>,
): ToneConfig => {
  const tone = getToneById(state, id) ?? getToneById(state, "default");
  if (!tone) {
    throw new Error("Default tone not found in state");
  }
  return toneToConfig(tone);
};

export const getActiveManualToneIds = (state: AppState): string[] => {
  const user = getMyUser(state);
  const toneIds = user?.activeToneIds ?? [];
  const validToneIds = toneIds.filter((id) => Boolean(getToneById(state, id)));
  return validToneIds.length > 0 ? validToneIds : ["default"];
};

export const getManuallySelectedToneId = (state: AppState): string => {
  const user = getMyUser(state);
  const toneId = user?.selectedToneId ?? null;
  const tone = getToneById(state, toneId);

  const activeIds = getActiveManualToneIds(state);
  if (tone && activeIds.includes(tone.id)) {
    return tone.id;
  }

  return activeIds.at(0) || "default";
};

const toneGroupOrder = (tone: Tone): number => {
  if (tone.isSystem) return 2;
  if (tone.isGlobal) return 1;
  return 0;
};

export const getSortedToneIds = (state: AppState): string[] => {
  const usedToneIds = new Set([
    getMyUser(state)?.selectedToneId,
    getMyUserPreferences(state)?.activeToneId,
    ...getActiveManualToneIds(state),
    ...Object.values(state.appTargetById)
      .map((t) => t.toneId)
      .filter(Boolean),
  ]);

  const tones = Object.values(state.toneById);
  return [...tones]
    .filter((t) => !t.isDeprecated || usedToneIds.has(t.id))
    .sort(
      (left, right) =>
        toneGroupOrder(left) - toneGroupOrder(right) ||
        right.createdAt - left.createdAt,
    )
    .map((t) => t.id);
};

export const getToneIdToUse = (
  state: AppState,
  args: {
    currentAppToneId: Nullable<string>;
  },
): Nullable<string> => {
  const mode = getEffectiveStylingMode(state);
  if (mode === "manual") {
    return getManuallySelectedToneId(state);
  } else {
    return args.currentAppToneId;
  }
};
