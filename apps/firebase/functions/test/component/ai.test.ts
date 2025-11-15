import { firemix } from "@firemix/mixed";
import { mixpath } from "@repo/firemix";
import { invokeHandler } from "@repo/functions";
import { retry } from "@repo/utilities";
import dayjs from "dayjs";
import { getFullConfig } from "../../src/utils/config.utils";
import { buildSilenceWavBase64 } from "../helpers/audio";
import { createUserCreds, markUserAsSubscribed, signInWithCreds } from "../helpers/firebase";
import { setUp, tearDown } from "../helpers/setup";

beforeAll(setUp);
afterAll(tearDown);

const SHORT_AUDIO_BASE64 = buildSilenceWavBase64(5, 8_000);
const LONG_AUDIO_BASE64 = buildSilenceWavBase64(301, 32_000);

const createMember = async () => {
  const creds = await createUserCreds();
  await signInWithCreds(creds);
  await markUserAsSubscribed();
  await invokeHandler("member/tryInitialize", {});
  return creds;
};

describe("ai/transcribeAudio", () => {
  it("blocks access if the daily word limit is exceeded", async () => {
    const creds = await createMember();
    await firemix().update(mixpath.members(creds.id), {
      wordsToday: getFullConfig().freeWordsPerDay,
      wordsThisMonth: 0,
      tokensToday: 0,
      tokensThisMonth: 0,
      todayResetAt: firemix().timestampFromDate(dayjs().add(1, "day").toDate()),
      thisMonthResetAt: firemix().timestampFromDate(
        dayjs().add(1, "month").toDate()
      ),
    });

    await expect(
      invokeHandler("ai/transcribeAudio", {
        audioBase64: SHORT_AUDIO_BASE64,
        audioMimeType: "audio/wav",
        simulate: true,
        language: "en",
      })
    ).rejects.toThrow("You have exceeded your word limit");
  });

  it("blocks access if the monthly word limit is exceeded", async () => {
    const creds = await createMember();
    await firemix().update(mixpath.members(creds.id), {
      wordsToday: 0,
      wordsThisMonth: getFullConfig().freeWordsPerMonth,
      tokensToday: 0,
      tokensThisMonth: 0,
      todayResetAt: firemix().timestampFromDate(dayjs().add(1, "day").toDate()),
      thisMonthResetAt: firemix().timestampFromDate(
        dayjs().add(1, "month").toDate()
      ),
    });

    await expect(
      invokeHandler("ai/transcribeAudio", {
        audioBase64: SHORT_AUDIO_BASE64,
        audioMimeType: "audio/wav",
        simulate: true,
        language: "en",
      })
    ).rejects.toThrow("You have exceeded your word limit");
  });

  it("increments word usage counters when transcription succeeds", async () => {
    const creds = await createMember();
    await firemix().update(mixpath.members(creds.id), {
      plan: "pro",
      wordsToday: 10,
      wordsThisMonth: 100,
      wordsTotal: 1_000,
      tokensToday: 0,
      tokensThisMonth: 0,
      tokensTotal: 0,
      todayResetAt: firemix().timestampFromDate(dayjs().subtract(1, "day").toDate()),
      thisMonthResetAt: firemix().timestampFromDate(
        dayjs().subtract(1, "month").toDate()
      ),
    });

    const res = await invokeHandler("ai/transcribeAudio", {
      audioBase64: SHORT_AUDIO_BASE64,
      audioMimeType: "audio/wav",
      simulate: true,
      language: "en",
    });

    expect(res.text).toBeDefined();
    expect(res.text.length).toBeGreaterThan(0);

    const member = await firemix().get(mixpath.members(creds.id));
    expect(member?.data.wordsToday).toBe(12);
    expect(member?.data.wordsThisMonth).toBe(102);
    expect(member?.data.wordsTotal).toBe(1002);
  });

  it("rejects audio longer than three minutes", async () => {
    const creds = await createMember();
    await firemix().update(mixpath.members(creds.id), {
      plan: "pro",
    });

    await expect(
      invokeHandler("ai/transcribeAudio", {
        audioBase64: LONG_AUDIO_BASE64,
        audioMimeType: "audio/wav",
        simulate: true,
        language: "en",
      })
    ).rejects.toThrow("Audio data exceeds maximum size of 16 MB");
  });

  it("rejects prompts longer than allowed length", async () => {
    const creds = await createMember();
    await firemix().update(mixpath.members(creds.id), {
      plan: "pro",
    });

    const longPrompt = "a".repeat(20_001);

    await expect(
      invokeHandler("ai/transcribeAudio", {
        prompt: longPrompt,
        audioBase64: SHORT_AUDIO_BASE64,
        audioMimeType: "audio/wav",
        simulate: true,
        language: "en",
      })
    ).rejects.toThrow(/String must contain at most 20000 character\(s\)/);
  });
});

describe("ai/generateText", () => {
  it("blocks access if the daily token limit is exceeded", async () => {
    const creds = await createMember();
    await firemix().update(mixpath.members(creds.id), {
      wordsToday: -1,
      wordsThisMonth: -1,
      tokensToday: getFullConfig().freeTokensPerDay,
      tokensThisMonth: 0,
      todayResetAt: firemix().timestampFromDate(dayjs().add(1, "day").toDate()),
      thisMonthResetAt: firemix().timestampFromDate(
        dayjs().add(1, "month").toDate()
      ),
    });

    await expect(
      invokeHandler("ai/generateText", {
        prompt: "Hello world",
        simulate: true,
      })
    ).rejects.toThrow("You have exceeded your token limit");
  });

  it("blocks access if the monthly token limit is exceeded", async () => {
    const creds = await createMember();
    await firemix().update(mixpath.members(creds.id), {
      wordsToday: -1,
      wordsThisMonth: -1,
      tokensToday: -1,
      tokensThisMonth: getFullConfig().freeTokensPerMonth,
      todayResetAt: firemix().timestampFromDate(dayjs().add(1, "day").toDate()),
      thisMonthResetAt: firemix().timestampFromDate(
        dayjs().add(1, "month").toDate()
      ),
    });

    await expect(
      invokeHandler("ai/generateText", {
        prompt: "Hello world",
        simulate: true,
      })
    ).rejects.toThrow("You have exceeded your token limit");
  });

  it("increments token usage counters when generation succeeds", async () => {
    const creds = await createMember();
    await firemix().update(mixpath.members(creds.id), {
      plan: "pro",
      wordsToday: 0,
      wordsThisMonth: 0,
      wordsTotal: 0,
      tokensToday: 5,
      tokensThisMonth: 50,
      tokensTotal: 500,
      todayResetAt: firemix().timestampFromDate(dayjs().subtract(1, "day").toDate()),
      thisMonthResetAt: firemix().timestampFromDate(
        dayjs().subtract(1, "month").toDate()
      ),
    });

    const res = await invokeHandler("ai/generateText", {
      prompt: "Hello world",
      simulate: true,
    });

    expect(res.text).toBeDefined();
    expect(res.text.length).toBeGreaterThan(0);

    const member = await firemix().get(mixpath.members(creds.id));
    expect(member?.data.tokensToday).toBe(8);
    expect(member?.data.tokensThisMonth).toBe(53);
    expect(member?.data.tokensTotal).toBe(503);
  });

  it("rejects prompts longer than allowed length", async () => {
    const creds = await createMember();
    await firemix().update(mixpath.members(creds.id), {
      plan: "pro",
    });

    const longPrompt = "a".repeat(25_001);

    await expect(
      invokeHandler("ai/generateText", {
        prompt: longPrompt,
        simulate: true,
      })
    ).rejects.toThrow(/String must contain at most 25000 character\(s\)/);
  });
});

describe("limit reset handlers", () => {
  it("resetting today clears both word and token daily usage", async () => {
    const creds = await createMember();
    await firemix().update(mixpath.members(creds.id), {
      wordsToday: 25,
      tokensToday: 30,
      todayResetAt: firemix().timestampFromDate(
        dayjs().subtract(1, "minute").toDate()
      ),
    });

    await invokeHandler("emulator/resetWordsToday", {});

    await retry({
      retries: 10,
      delay: 500,
      fn: async () => {
        const member = await firemix().get(mixpath.members(creds.id));
        expect(member?.data.wordsToday).toBe(0);
        expect(member?.data.tokensToday).toBe(0);
        const resetAt = member?.data.todayResetAt.toMillis();
        expect(resetAt).toBeGreaterThanOrEqual(
          dayjs().add(1, "day").subtract(1, "minute").toDate().getTime()
        );
        expect(resetAt).toBeLessThanOrEqual(
          dayjs().add(1, "day").add(1, "minute").toDate().getTime()
        );
      },
    });
  });

  it("resetting this month clears both word and token monthly usage", async () => {
    const creds = await createMember();
    await firemix().update(mixpath.members(creds.id), {
      wordsThisMonth: 250,
      tokensThisMonth: 500,
      thisMonthResetAt: firemix().timestampFromDate(
        dayjs().subtract(1, "minute").toDate()
      ),
    });

    await invokeHandler("emulator/resetWordsThisMonth", {});

    await retry({
      retries: 10,
      delay: 500,
      fn: async () => {
        const member = await firemix().get(mixpath.members(creds.id));
        expect(member?.data.wordsThisMonth).toBe(0);
        expect(member?.data.tokensThisMonth).toBe(0);
        const resetAt = member?.data.thisMonthResetAt.toMillis();
        expect(resetAt).toBeGreaterThanOrEqual(
          dayjs().add(1, "month").subtract(1, "minute").toDate().getTime()
        );
        expect(resetAt).toBeLessThanOrEqual(
          dayjs().add(1, "month").add(1, "minute").toDate().getTime()
        );
      },
    });
  });
});
