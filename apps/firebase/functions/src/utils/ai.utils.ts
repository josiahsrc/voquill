import type { CloudModel } from "@voquill/functions";
import { getRec } from "@voquill/utilities";
import type { GenerateTextModel } from "@voquill/voice-ai";

const CLOUD_MODEL_TO_GROQ_MODEL: Record<CloudModel, GenerateTextModel> = {
	low: "meta-llama/llama-4-scout-17b-16e-instruct",
	medium: "meta-llama/llama-4-scout-17b-16e-instruct",
	large: "moonshotai/kimi-k2-instruct-0905",
};

export const mapCloudModelToGroqModel = (
	model: CloudModel | null | undefined,
): GenerateTextModel => {
	return (
		getRec(CLOUD_MODEL_TO_GROQ_MODEL, model) ??
		"meta-llama/llama-4-scout-17b-16e-instruct"
	);
};
