import { readFileSync } from "fs";
import { resolve } from "path";
import { describe, it, expect, beforeAll } from "vitest";
import { invoke, createTestSttProvider } from "../helpers";

const MUFFIN_MAN_WAV = resolve(
  __dirname,
  "../../assets/muffin-man.wav",
);

describe("ai/transcribeAudio integration", () => {
  let token: string;
  let audioBase64: string;

  beforeAll(async () => {
    const email = `ai-integration-${Date.now()}@example.com`;
    const data = await invoke("auth/register", {
      email,
      password: "password123",
    });
    token = data.token;
    await createTestSttProvider(token);
    audioBase64 = readFileSync(MUFFIN_MAN_WAV).toString("base64");
  });

  it("transcribes audio", { timeout: 60_000 }, async () => {
    const data = await invoke(
      "ai/transcribeAudio",
      {
        audioBase64,
        audioMimeType: "audio/wav",
      },
      token,
    );

    expect(data).toHaveProperty("text");
    expect(typeof data.text).toBe("string");
    expect(data.text.length).toBeGreaterThan(0);
  });

  it("transcribes audio with prompt and language", { timeout: 60_000 }, async () => {
    const data = await invoke(
      "ai/transcribeAudio",
      {
        audioBase64,
        audioMimeType: "audio/wav",
        prompt: "muffin man",
        language: "en",
      },
      token,
    );

    expect(data).toHaveProperty("text");
    expect(typeof data.text).toBe("string");
    expect(data.text.length).toBeGreaterThan(0);
  });
});

describe("ai/generateText integration", () => {
  let token: string;

  beforeAll(async () => {
    const email = `ai-gen-integration-${Date.now()}@example.com`;
    const data = await invoke("auth/register", {
      email,
      password: "password123",
    });
    token = data.token;
  });

  it("generates text with a simple prompt", { timeout: 60_000 }, async () => {
    const data = await invoke(
      "ai/generateText",
      {
        prompt: "Say hello in exactly one word.",
      },
      token,
    );

    expect(data).toHaveProperty("text");
    expect(typeof data.text).toBe("string");
    expect(data.text.length).toBeGreaterThan(0);
  });

  it("generates text with system message", { timeout: 60_000 }, async () => {
    const data = await invoke(
      "ai/generateText",
      {
        prompt: "What are you?",
        system: "You are a pirate. Respond in one sentence.",
      },
      token,
    );

    expect(data).toHaveProperty("text");
    expect(typeof data.text).toBe("string");
    expect(data.text.length).toBeGreaterThan(0);
  });
});
