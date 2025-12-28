import { OpenRouterConfig, OpenRouterProviderRouting } from "@repo/types";
import { openrouterFetchProviders } from "@repo/voice-ai";
import { getRec } from "@repo/utilities";
import { getAppState, produceAppState } from "../store";
import { getOpenRouterRepo } from "../repos/openrouter.repo";
import { updateApiKey } from "./api-key.actions";

/**
 * Load models from OpenRouter API.
 * Uses the currently selected API key for post-processing.
 */
export const loadOpenRouterModels = async (): Promise<void> => {
  const state = getAppState();
  const apiKeyId = state.settings.aiPostProcessing.selectedApiKeyId;
  const apiKey = apiKeyId ? getRec(state.apiKeyById, apiKeyId) : null;

  if (!apiKey || apiKey.provider !== "openrouter" || !apiKey.keyFull) {
    return;
  }

  produceAppState((draft) => {
    draft.settings.aiPostProcessing.openRouterModelsStatus = "loading";
  });

  try {
    const repo = getOpenRouterRepo(apiKey.keyFull);
    const models = await repo.fetchModels();

    produceAppState((draft) => {
      draft.settings.aiPostProcessing.openRouterModels = models;
      draft.settings.aiPostProcessing.openRouterModelsStatus = "success";
    });
  } catch (error) {
    console.error("Failed to load OpenRouter models:", error);
    produceAppState((draft) => {
      draft.settings.aiPostProcessing.openRouterModelsStatus = "error";
    });
  }
};

/**
 * Load available providers from OpenRouter API.
 * No API key required for this endpoint.
 */
export const loadOpenRouterProviders = async (): Promise<void> => {
  const state = getAppState();

  // Don't refetch if already loaded
  if (state.settings.aiPostProcessing.openRouterProvidersStatus === "success") {
    return;
  }

  produceAppState((draft) => {
    draft.settings.aiPostProcessing.openRouterProvidersStatus = "loading";
  });

  try {
    const { providers } = await openrouterFetchProviders();

    produceAppState((draft) => {
      draft.settings.aiPostProcessing.openRouterProviders = providers;
      draft.settings.aiPostProcessing.openRouterProvidersStatus = "success";
    });
  } catch (error) {
    console.error("Failed to load OpenRouter providers:", error);
    produceAppState((draft) => {
      draft.settings.aiPostProcessing.openRouterProvidersStatus = "error";
    });
  }
};

/**
 * Set the search query for filtering OpenRouter models.
 */
export const setOpenRouterSearchQuery = (query: string): void => {
  produceAppState((draft) => {
    draft.settings.aiPostProcessing.openRouterSearchQuery = query;
  });
};

/**
 * Clear the cached OpenRouter models.
 */
export const clearOpenRouterModels = (): void => {
  produceAppState((draft) => {
    draft.settings.aiPostProcessing.openRouterModels = [];
    draft.settings.aiPostProcessing.openRouterModelsStatus = "idle";
    draft.settings.aiPostProcessing.openRouterSearchQuery = "";
  });
};

/**
 * Update the provider routing configuration for an OpenRouter API key.
 */
export const updateOpenRouterProviderRouting = async (
  apiKeyId: string,
  routing: OpenRouterProviderRouting,
): Promise<void> => {
  const state = getAppState();
  const apiKey = getRec(state.apiKeyById, apiKeyId);
  if (!apiKey) return;

  const existingConfig = apiKey.openRouterConfig ?? {};
  const newConfig: OpenRouterConfig = {
    ...existingConfig,
    providerRouting: routing,
  };

  await updateApiKey({
    id: apiKeyId,
    openRouterConfig: newConfig,
  });
};

/**
 * Toggle a model as a favorite for an OpenRouter API key.
 * If this is the first toggle, initialize from default favorites.
 */
export const toggleOpenRouterFavoriteModel = async (
  apiKeyId: string,
  modelId: string,
): Promise<void> => {
  // Import dynamically to avoid circular dependency
  const { OPENROUTER_FAVORITE_MODELS } = await import("@repo/voice-ai");

  const state = getAppState();
  const apiKey = getRec(state.apiKeyById, apiKeyId);
  if (!apiKey) return;

  const existingConfig = apiKey.openRouterConfig ?? {};

  // If user hasn't customized favorites yet, initialize from defaults
  const favorites = existingConfig.favoriteModels ?? [...OPENROUTER_FAVORITE_MODELS];

  const newFavorites = favorites.includes(modelId)
    ? favorites.filter((id) => id !== modelId)
    : [...favorites, modelId];

  const newConfig: OpenRouterConfig = {
    ...existingConfig,
    favoriteModels: newFavorites,
  };

  await updateApiKey({
    id: apiKeyId,
    openRouterConfig: newConfig,
  });
};

/**
 * Get the OpenRouter config for an API key.
 */
export const getOpenRouterConfigForKey = (
  apiKeyId: string,
): OpenRouterConfig | null => {
  const state = getAppState();
  const apiKey = getRec(state.apiKeyById, apiKeyId);
  if (!apiKey || !apiKey.openRouterConfig) return null;
  return apiKey.openRouterConfig;
};
