import { invokeHandler, type CloudModel } from "@repo/functions";
import { JsonResponse, Nullable, OpenRouterProviderRouting } from "@repo/types";
import {
  azureOpenAIGenerateText,
  deepseekGenerateTextResponse,
  DeepseekModel,
  GenerateTextModel,
  groqGenerateTextResponse,
  OpenAIGenerateTextModel,
  openaiGenerateTextResponse,
  OPENROUTER_DEFAULT_MODEL,
  openrouterGenerateTextResponse,
} from "@repo/voice-ai";
import { fetch as tauriFetch } from "@tauri-apps/plugin-http";
import { PostProcessingMode } from "../types/ai.types";
import { BaseRepo } from "./base.repo";

export type GenerateTextInput = {
  system?: Nullable<string>;
  prompt: string;
  jsonResponse?: JsonResponse;
};

export type GenerateTextMetadata = {
  postProcessingMode?: Nullable<PostProcessingMode>;
  inferenceDevice?: Nullable<string>;
};

export type GenerateTextOutput = {
  text: string;
  metadata?: GenerateTextMetadata;
};

export abstract class BaseGenerateTextRepo extends BaseRepo {
  abstract generateText(input: GenerateTextInput): Promise<GenerateTextOutput>;
}

export class CloudGenerateTextRepo extends BaseGenerateTextRepo {
  private model: CloudModel;

  constructor(model: CloudModel = "medium") {
    super();
    this.model = model;
  }

  async generateText(input: GenerateTextInput): Promise<GenerateTextOutput> {
    const response = await invokeHandler("ai/generateText", {
      system: input.system,
      prompt: input.prompt,
      jsonResponse: input.jsonResponse,
      model: this.model,
    });

    return {
      text: response.text,
      metadata: {
        postProcessingMode: "cloud",
      },
    };
  }
}

export class GroqGenerateTextRepo extends BaseGenerateTextRepo {
  private groqApiKey: string;
  private model: GenerateTextModel;

  constructor(apiKey: string, model: string | null) {
    super();
    this.groqApiKey = apiKey;
    this.model =
      (model as GenerateTextModel) ??
      "meta-llama/llama-4-scout-17b-16e-instruct";
  }

  async generateText(input: GenerateTextInput): Promise<GenerateTextOutput> {
    const response = await groqGenerateTextResponse({
      apiKey: this.groqApiKey,
      model: this.model,
      prompt: input.prompt,
      system: input.system ?? undefined,
      jsonResponse: input.jsonResponse,
    });

    return {
      text: response.text,
      metadata: {
        postProcessingMode: "api",
        inferenceDevice: "API • Groq",
      },
    };
  }
}

export class OpenAIGenerateTextRepo extends BaseGenerateTextRepo {
  private openaiApiKey: string;
  private model: OpenAIGenerateTextModel;

  constructor(apiKey: string, model: string | null) {
    super();
    this.openaiApiKey = apiKey;
    this.model = (model as OpenAIGenerateTextModel) ?? "gpt-4o-mini";
  }

  async generateText(input: GenerateTextInput): Promise<GenerateTextOutput> {
    const response = await openaiGenerateTextResponse({
      apiKey: this.openaiApiKey,
      model: this.model,
      prompt: input.prompt,
      system: input.system ?? undefined,
      jsonResponse: input.jsonResponse,
    });

    return {
      text: response.text,
      metadata: {
        postProcessingMode: "api",
        inferenceDevice: "API • OpenAI",
      },
    };
  }
}

export class OllamaGenerateTextRepo extends BaseGenerateTextRepo {
  private ollamaUrl: string;
  private model: string;
  private apiKey: string;

  constructor(url: string, model: string, apiKey?: string) {
    super();
    this.ollamaUrl = url;
    this.model = model;
    this.apiKey = apiKey || "ollama";
  }

  async generateText(input: GenerateTextInput): Promise<GenerateTextOutput> {
    const response = await openaiGenerateTextResponse({
      baseUrl: this.ollamaUrl,
      apiKey: this.apiKey,
      model: this.model,
      prompt: input.prompt,
      system: input.system ?? undefined,
      jsonResponse: input.jsonResponse,
      customFetch: tauriFetch,
    });

    return {
      text: response.text,
      metadata: {
        postProcessingMode: "api",
        inferenceDevice: "API • Ollama",
      },
    };
  }
}

export class OpenRouterGenerateTextRepo extends BaseGenerateTextRepo {
  private apiKey: string;
  private model: string;
  private providerRouting?: OpenRouterProviderRouting;

  constructor(
    apiKey: string,
    model: string | null,
    providerRouting?: OpenRouterProviderRouting,
  ) {
    super();
    this.apiKey = apiKey;
    this.model = model ?? OPENROUTER_DEFAULT_MODEL;
    this.providerRouting = providerRouting;
  }

  async generateText(input: GenerateTextInput): Promise<GenerateTextOutput> {
    const response = await openrouterGenerateTextResponse({
      apiKey: this.apiKey,
      model: this.model,
      prompt: input.prompt,
      system: input.system ?? undefined,
      jsonResponse: input.jsonResponse,
      providerRouting: this.providerRouting,
    });

    return {
      text: response.text,
      metadata: {
        postProcessingMode: "api",
        inferenceDevice: "API • OpenRouter",
      },
    };
  }
}

export class AzureOpenAIGenerateTextRepo extends BaseGenerateTextRepo {
  private apiKey: string;
  private endpoint: string;
  private deploymentName: string;

  constructor(apiKey: string, endpoint: string, deploymentName: string | null) {
    super();
    this.apiKey = apiKey;
    this.endpoint = endpoint;
    this.deploymentName = deploymentName ?? "gpt-4o-mini";
  }

  async generateText(input: GenerateTextInput): Promise<GenerateTextOutput> {
    const response = await azureOpenAIGenerateText({
      apiKey: this.apiKey,
      endpoint: this.endpoint,
      deploymentName: this.deploymentName,
      system: input.system ?? undefined,
      prompt: input.prompt,
      jsonResponse: input.jsonResponse,
    });

    return {
      text: response.text,
      metadata: {
        postProcessingMode: "api",
        inferenceDevice: "API • Azure OpenAI",
      },
    };
  }
}

export class DeepseekGenerateTextRepo extends BaseGenerateTextRepo {
  private apiKey: string;
  private model: DeepseekModel;

  constructor(apiKey: string, model: string | null) {
    super();
    this.apiKey = apiKey;
    this.model = (model as DeepseekModel) ?? "deepseek-chat";
  }

  async generateText(input: GenerateTextInput): Promise<GenerateTextOutput> {
    const response = await deepseekGenerateTextResponse({
      apiKey: this.apiKey,
      model: this.model,
      prompt: input.prompt,
      system: input.system ?? undefined,
      jsonResponse: input.jsonResponse,
    });

    return {
      text: response.text,
      metadata: {
        postProcessingMode: "api",
        inferenceDevice: "API • DeepSeek",
      },
    };
  }
}
