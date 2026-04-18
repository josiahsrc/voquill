import { describe, expect, it, vi } from "vitest";

describe("groqGenerateTextResponse", () => {
  it("uses a small completion budget for structured transcript cleanup", async () => {
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

    vi.resetModules();
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
      jsonResponse: {
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
      },
    });

    expect(createCompletion).toHaveBeenCalledTimes(1);
    expect(createCompletion.mock.calls[0][0]).toMatchObject({
      max_completion_tokens: 5000,
    });

    vi.doUnmock("groq-sdk/index");
  });
});
