import type { Nullable } from "./common.types";

/**
 * OpenRouter provider from GET /api/v1/providers endpoint
 */
export type OpenRouterProvider = {
  name: string;
  slug: string;
};

/**
 * OpenRouter model metadata from GET /api/v1/models endpoint
 */
export type OpenRouterModel = {
  id: string;
  name: string;
  description?: string;
  context_length: number;
  pricing: {
    prompt: string;
    completion: string;
  };
  architecture?: {
    modality: string;
    input_modalities: string[];
    output_modalities: string[];
    tokenizer: string;
  };
  top_provider?: {
    context_length: number;
    max_completion_tokens?: number;
  };
};

/**
 * Provider routing configuration for OpenRouter requests.
 * Controls which underlying providers are used for inference.
 */
export type OpenRouterProviderRouting = {
  /** Provider slugs to try in order (e.g., ["anthropic", "together"]) */
  order?: string[];
  /** Only use these providers (allowlist) */
  only?: string[];
  /** Never use these providers (blocklist) */
  ignore?: string[];
  /** Enable fallback to other providers (default: true) */
  allow_fallbacks?: boolean;
  /** Control data retention preference */
  data_collection?: "allow" | "deny";
};

/**
 * OpenRouter-specific configuration stored per API key
 */
export type OpenRouterConfig = {
  providerRouting?: Nullable<OpenRouterProviderRouting>;
  favoriteModels?: string[];
};
