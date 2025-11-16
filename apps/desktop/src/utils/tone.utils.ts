import { Tone } from "@repo/types";
import { getIntl } from "../i18n/intl";
import { getMyPreferredLocale } from "./user.utils";
import { getAppState } from "../store";

export const getLocalizedHardcodedTones = (): Tone[] => {
  const locale = getMyPreferredLocale(getAppState());
  const intl = getIntl(locale);

  return [
    {
      id: "light",
      name: intl.formatMessage({
        defaultMessage: "Light",
      }),
      promptTemplate: intl.formatMessage({
        defaultMessage: `
Make only surgical corrections that fix spelling, punctuation, or clear grammatical mistakes while keeping the speaker's sentences exactly as spoken.
Make the language vocal, clean, and free of filler while preserving the speaker's meaning. Remove filler words, false starts, repetitions, and disfluencies. Fix grammar and structure without embellishing, and preserve the speaker's tone exactly. Do not add notes or extra content. Always preserve meaningful input. Never return an empty result unless the input is truly empty.

Here is the transcript:
-------
{transcript}
-------
        `,
      }),
      isSystem: true,
      createdAt: 0,
      sortOrder: 0,
    },
    {
      id: "casual",
      name: intl.formatMessage({
        defaultMessage: "Casual",
      }),
      promptTemplate: intl.formatMessage({
        defaultMessage: `
The cleaned output should feel casual, vocal, and approachable—like a friendly conversation—while preserving the speaker's core message.
Make the language vocal, clean, and free of filler while preserving the speaker's meaning. Remove filler words, false starts, repetitions, and disfluencies. Fix grammar and structure without embellishing, and preserve the speaker's tone exactly. Do not add notes or extra content. Always preserve meaningful input. Never return an empty result unless the input is truly empty.

Here is the transcript:
-------
{transcript}
-------

        `,
      }),
      isSystem: true,
      createdAt: 0,
      sortOrder: 1,
    },
    {
      id: "formal",
      name: intl.formatMessage({
        defaultMessage: "Formal",
      }),
      promptTemplate: intl.formatMessage({
        defaultMessage: `
Deliver the result in a polished, formal register with precise grammar and professional language while keeping every idea from the speaker.
Make the language vocal, clean, and free of filler while preserving the speaker's meaning. Remove filler words, false starts, repetitions, and disfluencies. Fix grammar and structure without embellishing, and preserve the speaker's tone exactly. Do not add notes or extra content. Always preserve meaningful input. Never return an empty result unless the input is truly empty.

Here is the transcript:
-------
{transcript}
-------
        `,
      }),
      isSystem: true,
      createdAt: 0,
      sortOrder: 2,
    },
    {
      id: "business",
      name: intl.formatMessage({
        defaultMessage: "Business",
      }),
      promptTemplate: intl.formatMessage({
        defaultMessage: `
Return a concise, business-ready version that is direct, action-oriented, and focused on the key decisions or takeaways without losing meaning.
Make the language vocal, clean, and free of filler while preserving the speaker's meaning. Remove filler words, false starts, repetitions, and disfluencies. Fix grammar and structure without embellishing, and preserve the speaker's tone exactly. Do not add notes or extra content. Always preserve meaningful input. Never return an empty result unless the input is truly empty.

Here is the transcript:
-------
{transcript}
-------
        `,
      }),
      isSystem: true,
      createdAt: 0,
      sortOrder: 3,
    },
    {
      id: "punny",
      name: intl.formatMessage({
        defaultMessage: "Punny",
      }),
      promptTemplate: intl.formatMessage({
        defaultMessage: `
Inject clever puns and playful wordplay while keeping the original intent fully intact, and maintain the same level of polish as a clean transcript.
Make the language vocal, clean, and free of filler while preserving the speaker's meaning. Remove filler words, false starts, repetitions, and disfluencies. Fix grammar and structure without embellishing, and preserve the speaker's tone exactly. Do not add notes or extra content. Always preserve meaningful input. Never return an empty result unless the input is truly empty.

Here is the transcript:
-------
{transcript}
-------
        `,
      }),
      isSystem: true,
      createdAt: 0,
      sortOrder: 4,
    },
  ];
};
