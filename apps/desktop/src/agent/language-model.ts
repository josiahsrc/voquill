import type {
  LanguageModelV3,
  LanguageModelV3CallOptions,
  LanguageModelV3GenerateResult,
} from "@ai-sdk/provider";
import { UnsupportedFunctionalityError } from "@ai-sdk/provider";
import type { BaseGenerateTextRepo } from "../repos/generate-text.repo";

export class VoquillLanguageModel implements LanguageModelV3 {
  readonly specificationVersion = "v3" as const;
  readonly provider = "voquill";
  readonly supportedUrls: Record<string, RegExp[]> = {};

  private readonly repo: BaseGenerateTextRepo;

  constructor(repo: BaseGenerateTextRepo) {
    this.repo = repo;
  }

  get modelId(): string {
    return this.repo.getModelId();
  }

  async doGenerate(
    options: LanguageModelV3CallOptions,
  ): Promise<LanguageModelV3GenerateResult> {
    const result = await this.repo.doGenerateAiSdk({
      prompt: options.prompt,
      maxOutputTokens: options.maxOutputTokens,
      temperature: options.temperature,
      topP: options.topP,
      stopSequences: options.stopSequences,
      tools: options.tools,
      toolChoice: options.toolChoice,
      responseFormat: options.responseFormat,
      abortSignal: options.abortSignal,
    });

    return {
      content: result.content,
      finishReason: result.finishReason,
      usage: result.usage,
      warnings: result.warnings,
      providerMetadata: result.providerMetadata,
      response: result.response
        ? {
            id: result.response.id,
            timestamp: result.response.timestamp,
            modelId: result.response.modelId,
          }
        : undefined,
    };
  }

  async doStream(): Promise<never> {
    throw new UnsupportedFunctionalityError({
      functionality: "streaming",
      message: "VoquillLanguageModel does not support streaming yet",
    });
  }
}
