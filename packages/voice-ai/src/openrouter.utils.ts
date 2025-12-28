import OpenAI from "openai";
import { retry } from "@repo/utilities/src/async";
import { countWords } from "@repo/utilities/src/string";
import type { JsonResponse } from "@repo/types";
import type {
  OpenRouterModel,
  OpenRouterProvider,
  OpenRouterProviderRouting,
} from "@repo/types";

export const OPENROUTER_BASE_URL = "https://openrouter.ai/api/v1";
export const OPENROUTER_APP_NAME = "Voquill";
export const OPENROUTER_APP_URL = "https://voquill.com";

/**
 * Pre-set favorite models for quick access.
 * These are shown at the top of the model picker.
 */
export const OPENROUTER_FAVORITE_MODELS = [
  "openai/gpt-oss-120b",
  "openai/gpt-oss-20b",
] as const;

/**
 * Default model for testing and fallback
 */
export const OPENROUTER_DEFAULT_MODEL = "openai/gpt-4o-mini";

/**
 * Create OpenAI client configured for OpenRouter
 */
const createClient = (
  apiKey: string,
  customFetch?: typeof globalThis.fetch,
) => {
  return new OpenAI({
    apiKey: apiKey.trim(),
    baseURL: OPENROUTER_BASE_URL,
    dangerouslyAllowBrowser: true,
    fetch: customFetch,
    defaultHeaders: {
      "HTTP-Referer": OPENROUTER_APP_URL,
      "X-Title": OPENROUTER_APP_NAME,
    },
  });
};

// ============================================================================
// Fetch Models
// ============================================================================

export type OpenRouterFetchModelsArgs = {
  apiKey: string;
  customFetch?: typeof globalThis.fetch;
};

export type OpenRouterFetchModelsOutput = {
  models: OpenRouterModel[];
};

/**
 * Fetch all available models from OpenRouter.
 */
export const openrouterFetchModels = async ({
  apiKey,
  customFetch,
}: OpenRouterFetchModelsArgs): Promise<OpenRouterFetchModelsOutput> => {
  const fetchFn = customFetch ?? globalThis.fetch;

  const response = await fetchFn(`${OPENROUTER_BASE_URL}/models`, {
    headers: {
      Authorization: `Bearer ${apiKey.trim()}`,
      "HTTP-Referer": OPENROUTER_APP_URL,
      "X-Title": OPENROUTER_APP_NAME,
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch OpenRouter models: ${response.status} ${response.statusText}`);
  }

  const data = (await response.json()) as { data: OpenRouterModel[] };
  return { models: data.data ?? [] };
};

// ============================================================================
// Fetch Providers
// ============================================================================

export type OpenRouterFetchProvidersArgs = {
  customFetch?: typeof globalThis.fetch;
};

export type OpenRouterFetchProvidersOutput = {
  providers: OpenRouterProvider[];
};

/**
 * Fetch all available providers from OpenRouter.
 * No API key required for this endpoint.
 */
export const openrouterFetchProviders = async ({
  customFetch,
}: OpenRouterFetchProvidersArgs = {}): Promise<OpenRouterFetchProvidersOutput> => {
  const fetchFn = customFetch ?? globalThis.fetch;

  const response = await fetchFn(`${OPENROUTER_BASE_URL}/providers`, {
    headers: {
      "HTTP-Referer": OPENROUTER_APP_URL,
      "X-Title": OPENROUTER_APP_NAME,
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch OpenRouter providers: ${response.status} ${response.statusText}`);
  }

  const data = (await response.json()) as { data: OpenRouterProvider[] };
  return { providers: data.data ?? [] };
};

// ============================================================================
// Generate Text
// ============================================================================

export type OpenRouterGenerateTextArgs = {
  apiKey: string;
  model?: string;
  system?: string;
  prompt: string;
  jsonResponse?: JsonResponse;
  providerRouting?: OpenRouterProviderRouting;
  customFetch?: typeof globalThis.fetch;
};

export type OpenRouterGenerateTextOutput = {
  text: string;
  tokensUsed: number;
};

/**
 * Generate text using OpenRouter's chat completions API.
 * Uses the OpenAI SDK with custom baseURL since OpenRouter is OpenAI-compatible.
 */
export const openrouterGenerateTextResponse = async ({
  apiKey,
  model = OPENROUTER_DEFAULT_MODEL,
  system,
  prompt,
  jsonResponse,
  providerRouting,
  customFetch,
}: OpenRouterGenerateTextArgs): Promise<OpenRouterGenerateTextOutput> => {
  return retry({
    retries: 3,
    fn: async () => {
      const client = createClient(apiKey, customFetch);

      const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [];
      if (system) {
        messages.push({ role: "system", content: system });
      }
      messages.push({ role: "user", content: prompt });

      // Build the request with optional provider routing
      const requestParams: OpenAI.Chat.ChatCompletionCreateParamsNonStreaming & {
        provider?: OpenRouterProviderRouting;
      } = {
        messages,
        model,
        temperature: 1,
        max_tokens: 1024,
        top_p: 1,
        response_format: jsonResponse
          ? {
              type: "json_schema",
              json_schema: {
                name: jsonResponse.name,
                description: jsonResponse.description,
                schema: jsonResponse.schema,
                strict: true,
              },
            }
          : undefined,
      };

      // Add provider routing if specified
      if (providerRouting) {
        requestParams.provider = providerRouting;
      }

      const response = await client.chat.completions.create(requestParams);

      console.log("openrouter llm usage:", response.usage);
      if (!response.choices || response.choices.length === 0) {
        throw new Error("No response from OpenRouter");
      }

      const result = response.choices[0].message.content;
      if (!result) {
        throw new Error("Content is empty");
      }

      return {
        text: result,
        tokensUsed: response.usage?.total_tokens ?? countWords(result),
      };
    },
  });
};

// ============================================================================
// Test Integration
// ============================================================================

export type OpenRouterTestIntegrationArgs = {
  apiKey: string;
  customFetch?: typeof globalThis.fetch;
};

/**
 * Test if an OpenRouter API key is valid by making a simple chat completion.
 */
export const openrouterTestIntegration = async ({
  apiKey,
  customFetch,
}: OpenRouterTestIntegrationArgs): Promise<boolean> => {
  const client = createClient(apiKey, customFetch);

  const response = await client.chat.completions.create({
    messages: [
      {
        role: "user",
        content: 'Reply with the single word "Hello."',
      },
    ],
    model: OPENROUTER_DEFAULT_MODEL,
    temperature: 0,
    max_tokens: 32,
  });

  if (!response.choices || response.choices.length === 0) {
    throw new Error("No response from OpenRouter");
  }

  const content = response.choices[0]?.message?.content ?? "";
  return content.toLowerCase().includes("hello");
};
