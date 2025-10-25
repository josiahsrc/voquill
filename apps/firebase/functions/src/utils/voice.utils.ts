import { AuthData } from "firebase-functions/tasks";
import z from "zod";
import zodToJsonSchema from "zod-to-json-schema";
import {
	transcribeAudioWithGroq,
	postProcessTranscriptionWithGroq,
} from "@repo/voice-ai";
import { groqGenerateResponse } from "./ai.utils";
import { loadFullConfig } from "./config.utils";
import { dayjsForTimezone } from "./date.utils";
import { ClientError } from "./error.utils";
import { Member, Nullable, User } from "@repo/types";
import { firemix } from "@firemix/mixed";
import { mixpath } from "@repo/firemix";
import { getMemberExceedsWordLimit } from "./member.utils";
import { getGroqApiKey } from "./env.utils";

export const validateAudioInput = (args: {
	audioMimeType: string;
}): { ext: string } => {
	const audioMimeType = args.audioMimeType;
	const audioExt = audioMimeType.split("/").at(-1);
	if (!audioExt) {
		throw new ClientError("Invalid audio MIME type");
	}

	return { ext: audioExt };
};

export const validateMemberWithinLimits = async (args: {
	auth: AuthData;
}): Promise<{ member: Member }> => {
	const member = await firemix().get(mixpath.members(args.auth.uid));
	if (!member) {
		console.warn("no member found for user", args.auth.uid);
		throw new ClientError("You must be a member");
	}

	const config = await loadFullConfig();
	if (getMemberExceedsWordLimit(member.data, config)) {
		console.warn("member exceeds word limit", member.data);
		throw new ClientError("You have exceeded your word limit");
	}

	return { member: member.data };
};

export const transcribeAudioFromBase64 = async (args: {
	audioBase64: string;
	audioExt: string;
}): Promise<{ audioTranscript: string; durationSeconds: number }> => {
	const blob = Buffer.from(args.audioBase64, "base64");
	const mb = blob.length / (1024 * 1024);
	console.log("Processing", mb.toFixed(2), "MB of", args.audioExt, "audio");
	const audioTranscript = await transcribeAudioWithGroq({
		apiKey: getGroqApiKey(),
		audio: blob,
		ext: args.audioExt,
	});

	const bitrateMap: Record<string, number> = {
		mp3: 128_000,
		m4a: 128_000,
		aac: 128_000,
		wav: 256_000,
		flac: 700_000,
		ogg: 24_000,
		opus: 24_000,
		webm: 24_000,
	};

	const bitrate = bitrateMap[args.audioExt.toLowerCase()] || 128_000; // default fallback
	const durationSeconds = (blob.length * 8) / bitrate;

	return { audioTranscript, durationSeconds };
};

export const incrementWordCount = async (args: {
	auth: AuthData;
	count: number;
}): Promise<void> => {
	const roundedInt = Math.max(0, Math.round(args.count));
	await firemix().update(mixpath.members(args.auth.uid), {
		wordsToday: firemix().increment(roundedInt),
		wordsThisMonth: firemix().increment(roundedInt),
		wordsTotal: firemix().increment(roundedInt),
		updatedAt: firemix().now(),
	});
};

export const postProcessTranscription = async (
	rawTranscript: string,
): Promise<string> => {
	return postProcessTranscriptionWithGroq({
		apiKey: getGroqApiKey(),
		transcript: rawTranscript,
	});
};

export const fulfillTranscriptionIntent = async (args: {
	input: string;
	pageScreenshotBase64?: Nullable<string>;
	inputFieldContext?: Nullable<string>;
	currentInputTextValue?: Nullable<string>;
	currentInputTextSelection?: Nullable<string>;
	user?: Nullable<User>;
}): Promise<string> => {
	const zod = z.object({
		generatedDraft: z.string().describe("The generated draft"),
	});
	const schema = zodToJsonSchema(zod, "Schema").definitions?.Schema ?? {};

	const promptParts: string[] = [];
	promptParts.push(
		"You are a draft generator.",
		"You take what the user says and generate a draft response that will be injected into the input field.",
		"You replace all existing text in the input field with your response.",
		"You output your response with new lines and paragraph breaks where appropriate.",
		"You pull context from the page when it's useful.",
		"You do as instructed and nothing more. Never preface response with a header like 'here is the draft' or 'here is the response'.",
		"Never start a response by acknowledging the user's input.",
		"",
		"Your style should be casual, confident, and conversational, like thinking out loud. Sentences are short and direct, with a focus on action and problem-solving. Language is informal but precise, using phrases to describe technical work in a natural tone.",
		"",
	);

	const timezone = args.user?.timezone ?? "America/Denver";
	const today = dayjsForTimezone(timezone).format(
		"dddd, MMMM D, YYYY [at] h:mm A",
	);
	promptParts.push(`The current date is ${today} (${timezone}).`);
	console.log("today is ", today, "in timezone", timezone);

	if (args.user) {
		promptParts.push(`The user's name is ${args.user.name}.`);
		if (args.user.bio) {
			promptParts.push(`The user's bio is: ${args.user.bio}`);
		}
	}

	if (args.currentInputTextValue) {
		promptParts.push("## Current draft:", args.currentInputTextValue, "");
	}

	if (args.currentInputTextSelection) {
		promptParts.push(
			"## Emphasized content within current draft:",
			args.currentInputTextSelection,
			"",
		);
	}

	promptParts.push(
		"Here is the prompt you need to fulfill:",
		"------",
		args.input,
		"------",
	);

	const imageUrls: string[] = [];
	if (args.pageScreenshotBase64) {
		imageUrls.push(args.pageScreenshotBase64);
	}

	const result = await groqGenerateResponse({
		prompt: promptParts.join("\n").trim(),
		imageUrls,
		jsonResponse: {
			schema,
			name: "draft_generation",
			description: "JSON response with the generated draft",
		},
	});

	try {
		const parsed = zod.parse(JSON.parse(result));
		return parsed.generatedDraft;
	} catch (error) {
		console.error("Failed to parse draft generation response:", error);
		throw new Error("Invalid compose response format");
	}
};
