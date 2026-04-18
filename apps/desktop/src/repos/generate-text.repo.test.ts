import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  GeminiGenerateTextRepo,
  GroqGenerateTextRepo,
  OpenAIGenerateTextRepo,
  OpenRouterGenerateTextRepo,
} from "./generate-text.repo";

const {
  groqGenerateTextResponse,
  openaiGenerateTextResponse,
  openrouterGenerateTextResponse,
  geminiGenerateTextResponse,
} = vi.hoisted(() => ({
  groqGenerateTextResponse: vi.fn(),
  openaiGenerateTextResponse: vi.fn(),
  openrouterGenerateTextResponse: vi.fn(),
  geminiGenerateTextResponse: vi.fn(),
}));

vi.mock("@voquill/voice-ai", async () => {
  const actual =
    await vi.importActual<typeof import("@voquill/voice-ai")>(
      "@voquill/voice-ai",
    );
  return {
    ...actual,
    groqGenerateTextResponse,
    openaiGenerateTextResponse,
    openrouterGenerateTextResponse,
    geminiGenerateTextResponse,
  };
});

const JSON_RESPONSE = {
  name: "transcription_cleaning",
  description: "JSON response with the processed transcription",
  schema: {
    type: "object",
    properties: {
      result: {
        type: "string",
      },
    },
    required: ["result"],
  },
};

describe("generate text repos", () => {
  beforeEach(() => {
    groqGenerateTextResponse.mockReset().mockResolvedValue({
      text: "{}",
      tokensUsed: 1,
    });
    openaiGenerateTextResponse.mockReset().mockResolvedValue({
      text: "{}",
      tokensUsed: 1,
    });
    openrouterGenerateTextResponse.mockReset().mockResolvedValue({
      text: "{}",
      tokensUsed: 1,
    });
    geminiGenerateTextResponse.mockReset().mockResolvedValue({
      text: "{}",
      tokensUsed: 1,
    });
  });

  it("forwards maxOutputTokens to the Groq helper", async () => {
    const repo = new GroqGenerateTextRepo("test-key", "openai/gpt-oss-20b");

    await repo.generateText({
      prompt: "hello",
      jsonResponse: JSON_RESPONSE,
      maxOutputTokens: 256,
    });

    expect(groqGenerateTextResponse).toHaveBeenCalledWith(
      expect.objectContaining({
        maxOutputTokens: 256,
      }),
    );
  });

  it("forwards maxOutputTokens to the OpenAI helper", async () => {
    const repo = new OpenAIGenerateTextRepo("test-key", "gpt-4o-mini");

    await repo.generateText({
      prompt: "hello",
      jsonResponse: JSON_RESPONSE,
      maxOutputTokens: 256,
    });

    expect(openaiGenerateTextResponse).toHaveBeenCalledWith(
      expect.objectContaining({
        maxOutputTokens: 256,
      }),
    );
  });

  it("forwards maxOutputTokens to the OpenRouter helper", async () => {
    const repo = new OpenRouterGenerateTextRepo(
      "test-key",
      "openai/gpt-oss-20b",
    );

    await repo.generateText({
      prompt: "hello",
      jsonResponse: JSON_RESPONSE,
      maxOutputTokens: 256,
    });

    expect(openrouterGenerateTextResponse).toHaveBeenCalledWith(
      expect.objectContaining({
        maxOutputTokens: 256,
      }),
    );
  });

  it("forwards maxOutputTokens to the Gemini helper", async () => {
    const repo = new GeminiGenerateTextRepo("test-key", "gemini-2.5-flash");

    await repo.generateText({
      prompt: "hello",
      jsonResponse: JSON_RESPONSE,
      maxOutputTokens: 256,
    });

    expect(geminiGenerateTextResponse).toHaveBeenCalledWith(
      expect.objectContaining({
        maxOutputTokens: 256,
      }),
    );
  });
});
