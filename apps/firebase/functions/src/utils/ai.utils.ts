import type { CloudModel } from "@repo/functions";
import { getRec } from "@repo/utilities";
import type { GenerateTextModel } from "@repo/voice-ai";

const CLOUD_MODEL_TO_GROQ_MODEL: Record<CloudModel, GenerateTextModel> = {
	medium: "meta-llama/llama-4-scout-17b-16e-instruct",
	large: "openai/gpt-oss-120b",
};

export const mapCloudModelToGroqModel = (
	model: CloudModel | null | undefined,
): GenerateTextModel => {
	return (
		getRec(CLOUD_MODEL_TO_GROQ_MODEL, model) ??
		"meta-llama/llama-4-scout-17b-16e-instruct"
	);
};
