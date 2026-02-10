import type { CloudModel } from "@repo/functions";
import { getRec } from "@repo/utilities";
import type { GenerateTextModel } from "@repo/voice-ai";

const CLOUD_MODEL_TO_GROQ_MODEL: Record<CloudModel, GenerateTextModel> = {
	low: "openai/gpt-oss-120b",
	medium: "openai/gpt-oss-120b",
	large: "openai/gpt-oss-120b",
};

export const mapCloudModelToGroqModel = (
	model: CloudModel | null | undefined,
): GenerateTextModel => {
	return getRec(CLOUD_MODEL_TO_GROQ_MODEL, model) ?? "openai/gpt-oss-120b";
};
