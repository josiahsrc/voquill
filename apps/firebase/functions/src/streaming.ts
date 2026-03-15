import type { CloudModel, StreamHandlerName } from "@repo/functions";
import { AiStreamChatInputZod } from "@repo/functions";
import { z } from "zod";
import type { LlmChatInput, LlmStreamEvent } from "@repo/types";
import { groqStreamChat, openaiStreamChat } from "@repo/voice-ai";
import * as admin from "firebase-admin";
import type { AuthData } from "firebase-functions/tasks";
import { onRequest } from "firebase-functions/v2/https";
import { mapCloudModelToGroqModel } from "./utils/ai.utils";
import { checkAccess } from "./utils/check.utils";
import {
	getGroqApiKey,
	getOpenAIApiKey,
	GROQ_API_KEY_VAR,
	OPENAI_API_KEY_VAR,
} from "./utils/env.utils";
import { ClientError } from "./utils/error.utils";
import {
	incrementTokenCount,
	validateMemberWithinTokenLimits,
} from "./utils/voice.utils";

type StreamHandlerRequest = {
	name: StreamHandlerName;
	input: unknown;
};

function resolveStreamModel(model: CloudModel | null | undefined): {
	provider: "openai" | "groq";
	modelId: string;
} {
	if (model === "medium") {
		return { provider: "openai", modelId: "gpt-4o-mini" };
	} else if (model === "large") {
		return { provider: "openai", modelId: "gpt-5.4" };
	}
	return { provider: "groq", modelId: mapCloudModelToGroqModel(model) };
}

type AiStreamChatInput = z.infer<typeof AiStreamChatInputZod>;

// TODO: Clean up once have more handlers
async function* handleStreamChat(
	auth: AuthData,
	parsed: AiStreamChatInput,
): AsyncGenerator<LlmStreamEvent> {
	await checkAccess(auth);
	await validateMemberWithinTokenLimits({ auth });

	const { provider, modelId } = resolveStreamModel(parsed.model);
	const chatInput: LlmChatInput = {
		messages: parsed.messages as LlmChatInput["messages"],
		tools: parsed.tools as LlmChatInput["tools"],
		toolChoice: parsed.toolChoice as LlmChatInput["toolChoice"],
		maxTokens: parsed.maxTokens ?? undefined,
		temperature: parsed.temperature ?? undefined,
		stopSequences: parsed.stopSequences,
		topP: parsed.topP ?? undefined,
		frequencyPenalty: parsed.frequencyPenalty ?? undefined,
		presencePenalty: parsed.presencePenalty ?? undefined,
		seed: parsed.seed ?? undefined,
	};

	if (parsed.simulate) {
		yield { type: "text-delta", text: "Simulated stream response." };
		yield { type: "finish", finishReason: "stop" };
		await incrementTokenCount({ auth, count: 3 });
		return;
	}

	const generator =
		provider === "openai"
			? openaiStreamChat({
					apiKey: getOpenAIApiKey(),
					model: modelId,
					input: chatInput,
				})
			: groqStreamChat({
					apiKey: getGroqApiKey(),
					model: modelId,
					input: chatInput,
				});

	let tokensUsed = 0;
	for await (const event of generator) {
		yield event;
		if (event.type === "finish" && event.usage) {
			tokensUsed =
				(event.usage.promptTokens ?? 0) +
				(event.usage.completionTokens ?? 0);
		}
	}

	if (tokensUsed > 0) {
		await incrementTokenCount({ auth, count: tokensUsed });
	}
}

// TODO: Clean up once have more handlers
export const streamHandler = onRequest(
	{
		secrets: [GROQ_API_KEY_VAR, OPENAI_API_KEY_VAR],
		memory: "1GiB",
		maxInstances: 16,
		cors: true,
	},
	async (req, res) => {
		if (req.method !== "POST") {
			res.status(405).send("Method not allowed");
			return;
		}

		const authHeader = req.headers.authorization;
		if (!authHeader?.startsWith("Bearer ")) {
			res.status(401).send("Unauthorized");
			return;
		}

		let decodedToken: admin.auth.DecodedIdToken;
		try {
			decodedToken = await admin
				.auth()
				.verifyIdToken(authHeader.slice(7), true);
		} catch {
			res.status(401).send("Invalid token");
			return;
		}

		const rawToken = authHeader.slice(7);
		const auth: AuthData = {
			uid: decodedToken.uid,
			token: decodedToken,
			rawToken,
		};

		const { name, input } = req.body as StreamHandlerRequest;
		console.log("stream handler called", name);

		try {
			let generator: AsyncGenerator<LlmStreamEvent>;
			if (name === "ai/streamChat") {
				const result = AiStreamChatInputZod.safeParse(input);
				if (!result.success) {
					res.status(400).send("Invalid input");
					return;
				}
				generator = handleStreamChat(auth, result.data);
			} else {
				res.status(404).send(`Unknown stream handler: ${name}`);
				return;
			}

			res.setHeader("Content-Type", "application/x-ndjson");
			res.setHeader("Cache-Control", "no-cache");

			for await (const event of generator) {
				res.write(JSON.stringify(event) + "\n");
			}

			res.end();
		} catch (e) {
			console.error(e);
			if (!res.headersSent) {
				if (e instanceof ClientError) {
					res.status(400).send(e.message);
				} else {
					res.status(500).send("Internal server error");
				}
			} else {
				const errorEvent: LlmStreamEvent = {
					type: "error",
					error: e instanceof Error ? e.message : "Unknown error",
				};
				res.write(JSON.stringify(errorEvent) + "\n");
				res.end();
			}
		}
	},
);
