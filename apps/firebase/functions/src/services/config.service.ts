import { HandlerOutput } from "@repo/functions";
import { FULL_CONFIG } from "@repo/types";

const polishedTone = `
- WORD CHOICE: Preserve the speaker's word choice
- STRUCTURE: Refine the written transcript to read like naturally written text that flows well, without materially changing anything the speaker said or how they said it
- CLEAN UP: Remove filler words, false starts and speech disfluencies that carry no meaning. But always keep exclamations that are meaningful to the speaker's expression.
- SYMBOLS: Convert spoken symbol cues to actual symbols: "hashtag [word]" or "pound sign [word]" becomes "#[word]", and "at [name]" or "at sign [name]" becomes "@[name]".
- LISTS: Format bulletted lists when the user speaks items in a list format
- PARAGRAPHS: Split up the text into paragraphs where appropriate based on natural breaks in the speaker's thoughts and where they would naturally break when writing.
- CODE: Put backticks around code terms like filenames, function names, and code snippets (e.g. foo dot cpp becomes \`foo.cpp\`)
- SELF CORRECTIONS: When the speaker says something and then corrects themselves, ONLY keep the corrected version and remove the earlier one.
- EMOJIS: Convert spoken emoji descriptions into actual emoji characters (e.g. "smiley face" becomes "😊", "thumbs up" becomes "👍", etc.)
- **CRITICAL**: Do NOT use em-dashes in your response
`.trim();

const emailTone = `
- Sound like the speaker, but written
- Fix grammar, remove filler and disfluencies, and lightly restructure for readability
- Fit the speaker's words into an email format but do NOT add new phrasing, ideas, or words that would otherwise change the intent.
- Preserve the speaker's greeting and sign-off if present
- Remove filler words (um, uh, like, you know, so, basically, actually, I mean) and speech disfluencies (stutters, false starts, repeated words)
- Convert spoken symbol cues to actual symbols: "hashtag [word]" or "pound sign [word]" becomes "#[word]", and "at [name]" or "at sign [name]" becomes "@[name]".
- Format bulletted lists when the user speaks items in a list format
- Convert newlines and other intents into actual formatting where applicable (e.g. actual new lines for line breaks, etc.) and remove the word
- The resulting transcription should make sense
- Put backticks around code terms like filenames, function names, and code snippets
- It should remove and fix content that was later corrected by the speaker
- Format the transcription as a professional email, including a greeting, body, and sign-off; all while preserving the speaker's tone
- DO NOT introduce new phrasing
- DO NOT remove phrasing that would change the speaker's intent except for fixing errors
- **CRITICAL**: Do NOT use em-dashes in your response
`.trim();

export const getFullConfigResp = (): HandlerOutput<"config/getFullConfig"> => {
	return {
		config: {
			...FULL_CONFIG,
			toneOverrides: {
				default: polishedTone,
				email: emailTone,
			},
		},
	};
};
