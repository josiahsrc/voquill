import { Agent } from "@mastra/core/agent";
import { getGenerateTextRepo } from "../repos";
import { voquillModel } from "./provider";

export { VoquillLanguageModel } from "./language-model";
export {
  voquillModel,
  voquillProvider,
  type VoquillProvider,
} from "./provider";
export type {
  AiSdkGenerateOptions,
  AiSdkGenerateResult,
  LanguageModelV3,
  LanguageModelV3CallOptions,
  LanguageModelV3Content,
  LanguageModelV3FinishReason,
  LanguageModelV3FunctionTool,
  LanguageModelV3GenerateResult,
  LanguageModelV3Prompt,
  LanguageModelV3ToolChoice,
  LanguageModelV3Usage,
} from "./types";

export const createAgent = (): Agent => {
  const repo = getGenerateTextRepo().repo;
  if (!repo) {
    throw new Error("GenerateTextRepo is not available");
  }

  return new Agent({
    name: "voquill",
    id: "voquill-agent",
    instructions: {
      role: "system",
      content: "You are a helpful assistant",
    },
    model: voquillModel(repo),
  });
};
