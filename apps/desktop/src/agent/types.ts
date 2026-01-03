import type {
  LanguageModelV3,
  LanguageModelV3CallOptions,
  LanguageModelV3GenerateResult,
  LanguageModelV3Prompt,
  LanguageModelV3FunctionTool,
  LanguageModelV3ProviderTool,
  LanguageModelV3ToolChoice,
  LanguageModelV3Content,
  LanguageModelV3FinishReason,
  LanguageModelV3Usage,
  SharedV3ProviderMetadata,
  SharedV3Warning,
  JSONSchema7,
} from "@ai-sdk/provider";

// Re-export types that consumers might need
export type {
  LanguageModelV3,
  LanguageModelV3CallOptions,
  LanguageModelV3GenerateResult,
  LanguageModelV3Prompt,
  LanguageModelV3FunctionTool,
  LanguageModelV3ProviderTool,
  LanguageModelV3ToolChoice,
  LanguageModelV3Content,
  LanguageModelV3FinishReason,
  LanguageModelV3Usage,
  SharedV3ProviderMetadata,
  SharedV3Warning,
  JSONSchema7,
};

/**
 * Options for the AI SDK generate method on the repo.
 * This is a subset of LanguageModelV3CallOptions that we support.
 */
export type AiSdkGenerateOptions = {
  /** The prompt messages */
  prompt: LanguageModelV3Prompt;
  /** Maximum tokens to generate */
  maxOutputTokens?: number;
  /** Temperature for sampling */
  temperature?: number;
  /** Top P for nucleus sampling */
  topP?: number;
  /** Stop sequences */
  stopSequences?: string[];
  /** Available tools for the model */
  tools?: Array<LanguageModelV3FunctionTool | LanguageModelV3ProviderTool>;
  /** How to choose tools */
  toolChoice?: LanguageModelV3ToolChoice;
  /** Response format (text or JSON) */
  responseFormat?:
    | { type: "text" }
    | {
        type: "json";
        schema?: JSONSchema7;
        name?: string;
        description?: string;
      };
  /** Abort signal */
  abortSignal?: AbortSignal;
};

/**
 * Result from the AI SDK generate method on the repo.
 * This matches LanguageModelV3GenerateResult.
 */
export type AiSdkGenerateResult = {
  /** Generated content (text, tool calls, etc.) */
  content: LanguageModelV3Content[];
  /** Why generation stopped */
  finishReason: LanguageModelV3FinishReason;
  /** Token usage */
  usage: LanguageModelV3Usage;
  /** Warnings from the model */
  warnings: SharedV3Warning[];
  /** Provider-specific metadata */
  providerMetadata?: SharedV3ProviderMetadata;
  /** Response metadata */
  response?: {
    id: string;
    timestamp: Date;
    modelId: string;
  };
};
