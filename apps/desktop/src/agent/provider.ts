import type { LanguageModelV3 } from "@ai-sdk/provider";
import type { BaseGenerateTextRepo } from "../repos/generate-text.repo";
import { VoquillLanguageModel } from "./language-model";

export interface VoquillProvider {
  languageModel(): LanguageModelV3;
}

export function voquillProvider(repo: BaseGenerateTextRepo): VoquillProvider {
  return {
    languageModel(): LanguageModelV3 {
      return new VoquillLanguageModel(repo);
    },
  };
}

export function voquillModel(repo: BaseGenerateTextRepo): LanguageModelV3 {
  return new VoquillLanguageModel(repo);
}
