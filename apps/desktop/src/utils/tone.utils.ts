import { Nullable, Tone } from "@repo/types";
import { getRec } from "@repo/utilities";
import { getIntl } from "../i18n/intl";
import { AppState } from "../state/app.state";
import { getEffectiveStylingMode } from "./feature.utils";
import { getMyUser, getMyUserPreferences } from "./user.utils";

export const POLISHED_TONE_ID = "default";
export const VERBATIM_TONE_ID = "verbatim";
export const EMAIL_TONE_ID = "email";
export const CHAT_TONE_ID = "chat";
export const FORMAL_TONE_ID = "formal";

export const getDefaultSystemTones = (): Tone[] => {
  const intl = getIntl();

  return [
    {
      id: POLISHED_TONE_ID,
      name: intl.formatMessage({
        defaultMessage: "Polished",
      }),
      promptTemplate: `
- Rewrite the transcript into clean, readable text that the speaker would reasonably have written.
- Keep the speaker's original meaning, tone, phrasing, formality, and point of view.
- Do not make it more polite, formal, or professional than the original.
- Preserve grammatical person and referents. Do not change who is doing the action or who is being described unless the speaker clearly corrected themselves.
- Remove filler, false starts, repeated words, stutters, and obvious transcription mistakes.
- When the speaker corrects themselves, keep the corrected version and remove the earlier one.
- Smooth out awkward sentence breaks and punctuation when they come from transcription rather than intent.
- Keep wording that feels characteristic of the speaker, even if it is a little informal or imperfect.
- Format the result naturally as written text, including paragraphs, line breaks, bullet points when appropriate, punctuation, emojis, and special forms like code terms, file names, emails, links, hashtags, newlines, and parentheses when clearly intended.
- Output only the cleaned transcription.
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
      shouldDisablePostProcessing: true,
      promptTemplate:
        "Do not apply any post-processing to the transcription. Keep everything exactly as you said it.",
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
- Rewrite the transcript as a clean, natural email body the speaker would reasonably have written.
- Preserve the speaker’s meaning, tone, phrasing, formality, and point of view.
- Do not make it more polite, formal, professional, smoother, or more general than the original.
- Preserve pronouns and referents literally. Do not reinterpret, harmonize, or “clean up” who a pronoun refers to. If the transcript says “you” in one clause and “he” in the next, keep that shift unless the speaker explicitly corrected it.
- Do not replace specific pronouns or subjects with generic nouns or different pronouns. Never rewrite “he” as “they,” “you,” “users,” “people,” or similar unless the speaker clearly corrected themselves.
- Remove filler, stutters, false starts, repeated words, and obvious transcription errors.
- Treat self-corrections as replacements: keep the later corrected wording and remove the abandoned wording.
- Fix punctuation, sentence breaks, and formatting so it reads naturally as an email, but prefer preserving meaning and referents over making the wording smoother.
- Keep informal or distinctive wording when it seems intentional.
- Use email structure only where implied by the transcript, including greeting, paragraph breaks, closing, sign-off, and bullet points when appropriate.
- Do not generate or include an email subject line.
- Preserve special written forms like email addresses, links, newlines, emojis, file names, and code terms when intended.
- Output only the cleaned email body.
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
- Preserve the speaker's tone and personality. Do not elevate or formalize, but refine phrasing to read naturally as written text.
- Remove filler words (like, just, um, etc), stutters, and false starts.
- Always remove/fix words that are later self-corrected. Keep only the final intended version of each thought. Self-corrections include patterns like "X, actually, Y", "X, no, Y", "X, I mean Y", "X, or rather, Y", "X... wait, Y", and "X, excuse me, Y" — in all of these, drop X entirely and keep only Y.
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
- Remove filler words (like, just, um, etc), stutters, and false starts.
- Always remove/fix words that are later self-corrected. Keep only the final intended version of each thought. Self-corrections include patterns like "X, actually, Y", "X, no, Y", "X, I mean Y", "X, or rather, Y", "X... wait, Y", and "X, excuse me, Y" — in all of these, drop X entirely and keep only Y.
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
    {
      id: "disabled",
      name: intl.formatMessage({
        defaultMessage: "Disabled",
      }),
      promptTemplate: "Do not apply any post-processing to the transcription.",
      isSystem: true,
      createdAt: 0,
      sortOrder: 5,
      shouldDisablePostProcessing: true,
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
  opts?: {
    currentAppToneId: Nullable<string>;
  },
): Nullable<string> => {
  const mode = getEffectiveStylingMode(state);
  if (mode === "manual") {
    return getManuallySelectedToneId(state);
  } else {
    return opts?.currentAppToneId ?? null;
  }
};
