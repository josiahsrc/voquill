import { afterEach, describe, expect, it, vi } from "vitest";

describe("generate text helper output budgets", () => {
  afterEach(() => {
    vi.resetModules();
    vi.doUnmock("groq-sdk/index");
    vi.doUnmock("openai");
    vi.doUnmock("@google/genai");
  });

  it("uses the safer Groq default budget when no override is provided", async () => {
    const createCompletion = vi.fn().mockResolvedValue({
      choices: [
        {
          message: {
            content: JSON.stringify({ result: "Hello there" }),
          },
        },
      ],
      usage: {
        total_tokens: 42,
      },
    });

    vi.doMock("groq-sdk/index", () => ({
      default: class MockGroq {
        chat = {
          completions: {
            create: createCompletion,
          },
        };
      },
      toFile: vi.fn(),
    }));

    const { groqGenerateTextResponse } = await import("../src/groq.utils");

    await groqGenerateTextResponse({
      apiKey: "test-key",
      prompt: "hello there",
    });

    expect(createCompletion.mock.calls[0][0]).toMatchObject({
      max_completion_tokens: 1024,
    });
  });

  it("passes the override through to Groq", async () => {
    const createCompletion = vi.fn().mockResolvedValue({
      choices: [
        {
          message: {
            content: JSON.stringify({ result: "Hello there" }),
          },
        },
      ],
      usage: {
        total_tokens: 42,
      },
    });

    vi.doMock("groq-sdk/index", () => ({
      default: class MockGroq {
        chat = {
          completions: {
            create: createCompletion,
          },
        };
      },
      toFile: vi.fn(),
    }));

    const { groqGenerateTextResponse } = await import("../src/groq.utils");

    await groqGenerateTextResponse({
      apiKey: "test-key",
      prompt: "hello there",
      maxOutputTokens: 256,
    });

    expect(createCompletion.mock.calls[0][0]).toMatchObject({
      max_completion_tokens: 256,
    });
  });

  it("passes the override through to OpenRouter", async () => {
    const createCompletion = vi.fn().mockResolvedValue({
      choices: [
        {
          message: {
            content: JSON.stringify({ result: "Hello there" }),
          },
        },
      ],
      usage: {
        total_tokens: 42,
      },
    });

    vi.doMock("openai", () => ({
      default: class MockOpenAI {
        chat = {
          completions: {
            create: createCompletion,
          },
        };
      },
    }));

    const { openrouterGenerateTextResponse } = await import(
      "../src/openrouter.utils"
    );

    await openrouterGenerateTextResponse({
      apiKey: "test-key",
      prompt: "hello there",
      maxOutputTokens: 256,
    });

    expect(createCompletion.mock.calls[0][0]).toMatchObject({
      max_tokens: 256,
    });
  });

  it("passes the override through to Gemini", async () => {
    const generateContent = vi.fn().mockResolvedValue({
      text: '{"result":"Hello there"}',
      usageMetadata: {
        totalTokenCount: 42,
      },
    });

    vi.doMock("@google/genai", () => ({
      GoogleGenAI: class MockGoogleGenAI {
        models = {
          generateContent,
        };
      },
      Type: {
        OBJECT: "object",
        ARRAY: "array",
        STRING: "string",
        NUMBER: "number",
        INTEGER: "integer",
        BOOLEAN: "boolean",
      },
    }));

    const { geminiGenerateTextResponse } = await import("../src/gemini.utils");

    await geminiGenerateTextResponse({
      apiKey: "test-key",
      prompt: "hello there",
      maxOutputTokens: 256,
    });

    expect(generateContent.mock.calls[0][0]).toMatchObject({
      config: expect.objectContaining({
        maxOutputTokens: 256,
      }),
    });
  });
});
