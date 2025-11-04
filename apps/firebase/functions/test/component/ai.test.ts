import dayjs from "dayjs";
import { firemix } from "@firemix/mixed";
import { invokeHandler } from "@repo/functions";
import { mixpath } from "@repo/firemix";
import { retry } from "@repo/utilities";
import { createUserCreds, signInWithCreds } from "../helpers/firebase";
import { setUp, tearDown } from "../helpers/setup";

beforeAll(setUp);
afterAll(tearDown);

const config = {
  freeWordsPerDay: 1000,
  freeWordsPerMonth: 10_000,
  proWordsPerDay: 10_000,
  proWordsPerMonth: 100_000,
  freeTokensPerDay: 2_000,
  freeTokensPerMonth: 20_000,
  proTokensPerDay: 20_000,
  proTokensPerMonth: 200_000,
};

const createMember = async () => {
  const creds = await createUserCreds();
  await signInWithCreds(creds);
  await invokeHandler("member/tryInitialize", {});
  return creds;
};

beforeAll(async () => {
  await firemix().set(mixpath.systemConfig(), config);
});

describe("ai/transcribeAudio", () => {
  it("blocks access if the daily word limit is exceeded", async () => {
    const creds = await createMember();
    await firemix().update(mixpath.members(creds.id), {
      wordsToday: config.freeWordsPerDay,
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
        audioBase64: "dGVzdA==",
        audioMimeType: "audio/wav",
        simulate: true,
      })
    ).rejects.toThrow("You have exceeded your word limit");
  });

  it("blocks access if the monthly word limit is exceeded", async () => {
    const creds = await createMember();
    await firemix().update(mixpath.members(creds.id), {
      wordsToday: 0,
      wordsThisMonth: config.freeWordsPerMonth,
      tokensToday: 0,
      tokensThisMonth: 0,
      todayResetAt: firemix().timestampFromDate(dayjs().add(1, "day").toDate()),
      thisMonthResetAt: firemix().timestampFromDate(
        dayjs().add(1, "month").toDate()
      ),
    });

    await expect(
      invokeHandler("ai/transcribeAudio", {
        audioBase64: "dGVzdA==",
        audioMimeType: "audio/wav",
        simulate: true,
      })
    ).rejects.toThrow("You have exceeded your word limit");
  });

  it("increments word usage counters when transcription succeeds", async () => {
    const creds = await createMember();
    await firemix().update(mixpath.members(creds.id), {
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
      audioBase64: "dGVzdA==",
      audioMimeType: "audio/wav",
      simulate: true,
    });

    expect(res.text).toBeDefined();
    expect(res.text.length).toBeGreaterThan(0);

    const member = await firemix().get(mixpath.members(creds.id));
    expect(member?.data.wordsToday).toBe(12);
    expect(member?.data.wordsThisMonth).toBe(102);
    expect(member?.data.wordsTotal).toBe(1002);
  });
});

describe("ai/generateText", () => {
  it("blocks access if the daily token limit is exceeded", async () => {
    const creds = await createMember();
    await firemix().update(mixpath.members(creds.id), {
      wordsToday: 0,
      wordsThisMonth: 0,
      tokensToday: config.freeTokensPerDay,
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
      wordsToday: 0,
      wordsThisMonth: 0,
      tokensToday: 0,
      tokensThisMonth: config.freeTokensPerMonth,
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
