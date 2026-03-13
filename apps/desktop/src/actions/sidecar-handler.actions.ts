import type {
  LlmChatRequest,
  OpenAiChatCompletion,
  OpenAiChatRequest,
  SidecarRequest,
  SidecarResponse,
} from "@repo/types";
import { getRec } from "@repo/utilities";
import { fetch as tauriFetch } from "@tauri-apps/plugin-http";
import { getAppState } from "../store";
import { getLogger } from "../utils/log.utils";
import { OLLAMA_DEFAULT_URL } from "../utils/ollama.utils";
import { buildOpenAICompatibleUrl } from "../utils/openai-compatible.utils";
import {
  type ApiGenerativePrefs,
  getAgentModePrefs,
} from "../utils/user.utils";

export type SidecarResponder = (response: SidecarResponse) => Promise<void>;

export async function handleSidecarRequest(
  request: SidecarRequest,
  respond: SidecarResponder,
): Promise<void> {
  getLogger().info(`[sidecar-handler] Received request: ${request.type}`);

  try {
    switch (request.type) {
      case "tools/list":
        return await respond({
          id: request.id,
          status: "ok",
          result: { tools: [] },
        });
      case "llm/chat":
        return await handleLlmChat(request, respond);
      default:
        return await respond({
          id: request.id,
          status: "error",
          error: `Unsupported sidecar request: ${request.type}`,
        });
    }
  } catch (error) {
    getLogger().error(
      `[sidecar-handler] Error handling ${request.type}:`,
      error,
    );
    await respond({
      id: request.id,
      status: "error",
      error: String(error),
    });
  }
}

type ProviderConfig = {
  baseUrl: string;
  apiKey: string;
  model: string;
};

function resolveProviderConfig(): ProviderConfig {
  const state = getAppState();
  const prefs = getAgentModePrefs(state);

  if (prefs.mode === "none") {
    throw new Error("No agent mode configured. Set up a provider in Settings.");
  }

  if (prefs.mode === "cloud") {
    throw new Error("Cloud LLM proxy is not yet supported for the AI sidecar.");
  }

  if (prefs.mode === "openclaw") {
    throw new Error(
      "OpenClaw provides its own LLM — sidecar LLM proxy is not needed.",
    );
  }

  const apiPrefs = prefs as ApiGenerativePrefs;
  const apiKeyRecord = getRec(state.apiKeyById, apiPrefs.apiKeyId);

  switch (apiPrefs.provider) {
    case "openai":
      return {
        baseUrl: "https://api.openai.com/v1",
        apiKey: apiPrefs.apiKeyValue,
        model: apiPrefs.postProcessingModel ?? "gpt-4o-mini",
      };
    case "groq":
      return {
        baseUrl: "https://api.groq.com/openai/v1",
        apiKey: apiPrefs.apiKeyValue,
        model:
          apiPrefs.postProcessingModel ??
          "meta-llama/llama-4-scout-17b-16e-instruct",
      };
    case "openrouter":
      return {
        baseUrl: "https://openrouter.ai/api/v1",
        apiKey: apiPrefs.apiKeyValue,
        model: apiPrefs.postProcessingModel ?? "openai/gpt-4o-mini",
      };
    case "deepseek":
      return {
        baseUrl: "https://api.deepseek.com",
        apiKey: apiPrefs.apiKeyValue,
        model: apiPrefs.postProcessingModel ?? "deepseek-chat",
      };
    case "ollama": {
      const baseUrl = apiKeyRecord?.baseUrl || OLLAMA_DEFAULT_URL;
      return {
        baseUrl: `${baseUrl}/v1`,
        apiKey: apiKeyRecord?.keyFull || "ollama",
        model: apiPrefs.postProcessingModel ?? "llama3.2",
      };
    }
    case "openai-compatible": {
      const fullUrl = buildOpenAICompatibleUrl(
        apiKeyRecord?.baseUrl,
        apiKeyRecord?.includeV1Path,
      );
      return {
        baseUrl: fullUrl,
        apiKey: apiKeyRecord?.keyFull || "",
        model: apiPrefs.postProcessingModel ?? "default",
      };
    }
    default:
      throw new Error(
        `Provider "${apiPrefs.provider}" is not yet supported for the AI sidecar LLM proxy.`,
      );
  }
}

async function handleLlmChat(
  request: LlmChatRequest,
  respond: SidecarResponder,
): Promise<void> {
  const config = resolveProviderConfig();

  const body: OpenAiChatRequest = {
    ...request.request,
    model:
      !request.request.model || request.request.model === "default"
        ? config.model
        : request.request.model,
  };

  const url = `${config.baseUrl}/chat/completions`;

  getLogger().info(
    `[sidecar-llm] Proxying llm/chat to ${url} (model=${body.model}, stream=${body.stream})`,
  );

  const response = await tauriFetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${config.apiKey}`,
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorText = await response.text();
    return await respond({
      id: request.id,
      status: "error",
      error: errorText || `LLM upstream returned HTTP ${response.status}`,
    });
  }

  if (!body.stream) {
    const result = (await response.json()) as OpenAiChatCompletion;
    return await respond({
      id: request.id,
      status: "ok",
      result,
    });
  }

  if (!response.body) {
    return await respond({
      id: request.id,
      status: "error",
      error: "LLM upstream returned an empty stream body",
    });
  }

  await forwardSseChunks(request.id, response.body, respond);
  await respond({ id: request.id, status: "done" });
}

async function forwardSseChunks(
  id: string,
  stream: ReadableStream<Uint8Array>,
  respond: SidecarResponder,
): Promise<void> {
  const reader = stream.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const events = buffer.split(/\r?\n\r?\n/);
    buffer = events.pop() || "";

    for (const event of events) {
      const dataLines = event
        .split(/\r?\n/)
        .filter((line) => line.startsWith("data:"))
        .map((line) => line.slice(5).trim());

      if (dataLines.length === 0) continue;

      const payload = dataLines.join("\n");
      if (payload === "[DONE]") return;

      await respond({
        id,
        status: "chunk",
        data: JSON.parse(payload) as OpenAiChatCompletion,
      });
    }
  }
}
