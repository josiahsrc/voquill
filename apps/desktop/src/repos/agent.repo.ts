import { JsonResponse, Nullable, OpenRouterProviderRouting } from "@repo/types";
import {
  groqGenerateTextResponse,
  GenerateTextModel,
  openaiGenerateTextResponse,
  OpenAIGenerateTextModel,
  openrouterGenerateTextResponse,
  OPENROUTER_DEFAULT_MODEL,
} from "@repo/voice-ai";
import { fetch as tauriFetch } from "@tauri-apps/plugin-http";
import { AgentMode } from "../types/ai.types";
import { BaseRepo } from "./base.repo";

export type ProcessWithAgentInput = {
  system?: Nullable<string>;
  prompt: string;
  jsonResponse?: JsonResponse;
};

export type ProcessWithAgentMetadata = {
  agentMode?: Nullable<AgentMode>;
  inferenceDevice?: Nullable<string>;
};

export type ProcessWithAgentOutput = {
  text: string;
  metadata?: ProcessWithAgentMetadata;
};

export abstract class BaseAgentRepo extends BaseRepo {
  abstract processWithAgent(
    input: ProcessWithAgentInput,
  ): Promise<ProcessWithAgentOutput>;
}

export class CloudAgentRepo extends BaseAgentRepo {
  async processWithAgent(
    _: ProcessWithAgentInput,
  ): Promise<ProcessWithAgentOutput> {
    // const response = await invokeHandler("ai/processWithAgent", {
    //   system: input.system,
    //   prompt: input.prompt,
    //   jsonResponse: input.jsonResponse,
    // });

    return {
      text: "", // response.text,
      metadata: {
        agentMode: "cloud",
      },
    };
  }
}

export class GroqAgentRepo extends BaseAgentRepo {
  private groqApiKey: string;
  private model: GenerateTextModel;

  constructor(apiKey: string, model: string | null) {
    super();
    this.groqApiKey = apiKey;
    this.model =
      (model as GenerateTextModel) ??
      "meta-llama/llama-4-scout-17b-16e-instruct";
  }

  async processWithAgent(
    input: ProcessWithAgentInput,
  ): Promise<ProcessWithAgentOutput> {
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
        agentMode: "api",
        inferenceDevice: "API • Groq",
      },
    };
  }
}

export class OpenAIAgentRepo extends BaseAgentRepo {
  private openaiApiKey: string;
  private model: OpenAIGenerateTextModel;

  constructor(apiKey: string, model: string | null) {
    super();
    this.openaiApiKey = apiKey;
    this.model = (model as OpenAIGenerateTextModel) ?? "gpt-4o-mini";
  }

  async processWithAgent(
    input: ProcessWithAgentInput,
  ): Promise<ProcessWithAgentOutput> {
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
        agentMode: "api",
        inferenceDevice: "API • OpenAI",
      },
    };
  }
}

export class OpenRouterAgentRepo extends BaseAgentRepo {
  private openRouterApiKey: string;
  private model: string;
  private providerRouting?: Nullable<OpenRouterProviderRouting>;

  constructor(
    apiKey: string,
    model: string | null,
    providerRouting?: Nullable<OpenRouterProviderRouting>,
  ) {
    super();
    this.openRouterApiKey = apiKey;
    this.model = model ?? OPENROUTER_DEFAULT_MODEL;
    this.providerRouting = providerRouting;
  }

  async processWithAgent(
    input: ProcessWithAgentInput,
  ): Promise<ProcessWithAgentOutput> {
    const response = await openrouterGenerateTextResponse({
      apiKey: this.openRouterApiKey,
      model: this.model,
      prompt: input.prompt,
      system: input.system ?? undefined,
      jsonResponse: input.jsonResponse,
      providerRouting: this.providerRouting ?? undefined,
    });

    return {
      text: response.text,
      metadata: {
        agentMode: "api",
        inferenceDevice: "API • OpenRouter",
      },
    };
  }
}

export class OllamaAgentRepo extends BaseAgentRepo {
  private baseUrl: string;
  private model: string;

  constructor(baseUrl: string, model: string) {
    super();
    this.baseUrl = baseUrl;
    this.model = model;
  }

  async processWithAgent(
    input: ProcessWithAgentInput,
  ): Promise<ProcessWithAgentOutput> {
    const messages: Array<{ role: string; content: string }> = [];

    if (input.system) {
      messages.push({ role: "system", content: input.system });
    }

    messages.push({ role: "user", content: input.prompt });

    const body: {
      model: string;
      messages: Array<{ role: string; content: string }>;
      stream: boolean;
      format?: string;
    } = {
      model: this.model,
      messages,
      stream: false,
    };

    if (input.jsonResponse) {
      body.format = "json";
    }

    const response = await tauriFetch(`${this.baseUrl}/api/chat`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    const text = data.message.content;

    return {
      text,
      metadata: {
        agentMode: "api",
        inferenceDevice: "Local • Ollama",
      },
    };
  }
}
