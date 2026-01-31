import { invoke, createTestSttProvider, createTestAuth, cleanupTestAuths } from "../helpers";

afterAll(cleanupTestAuths);

describe("ai/transcribeAudio", () => {
  let token: string;

  beforeAll(async () => {
    const data = await createTestAuth();
    token = data.token;
    await createTestSttProvider(token);
  });

  it("returns simulated transcription", async () => {
    const audioBase64 = Buffer.from("fake audio data").toString("base64");
    const data = await invoke(
      "ai/transcribeAudio",
      {
        audioBase64,
        audioMimeType: "audio/wav",
        simulate: true,
      },
      token,
    );

    expect(data.text).toBe("Simulated response");
  });

  it("rejects empty audio", async () => {
    await expect(
      invoke(
        "ai/transcribeAudio",
        {
          audioBase64: "",
          audioMimeType: "audio/wav",
          simulate: true,
        },
        token,
      ),
    ).rejects.toThrow("400");
  });

  it("rejects without auth token", async () => {
    await expect(
      invoke("ai/transcribeAudio", {
        audioBase64: Buffer.from("fake").toString("base64"),
        audioMimeType: "audio/wav",
        simulate: true,
      }),
    ).rejects.toThrow("401");
  });
});

describe("ai/generateText", () => {
  let token: string;

  beforeAll(async () => {
    const data = await createTestAuth();
    token = data.token;
  });

  it("returns simulated text", async () => {
    const data = await invoke(
      "ai/generateText",
      {
        prompt: "Say hello",
        simulate: true,
      },
      token,
    );

    expect(data.text).toBe("Simulated generated text.");
  });

  it("rejects without auth token", async () => {
    await expect(
      invoke("ai/generateText", {
        prompt: "Say hello",
        simulate: true,
      }),
    ).rejects.toThrow("401");
  });

  it("rejects prompt exceeding max length", async () => {
    await expect(
      invoke(
        "ai/generateText",
        {
          prompt: "a".repeat(25_001),
          simulate: true,
        },
        token,
      ),
    ).rejects.toThrow("400");
  });

  it("accepts optional system message", async () => {
    const data = await invoke(
      "ai/generateText",
      {
        prompt: "Say hello",
        system: "You are a helpful assistant.",
        simulate: true,
      },
      token,
    );

    expect(data.text).toBe("Simulated generated text.");
  });
});
