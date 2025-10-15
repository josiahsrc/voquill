import dayjs from "dayjs";
import { invokeHandler } from "@repo/functions";
import { createUserCreds, signInWithCreds } from "../helpers/firebase";
import { setUp, tearDown } from "../helpers/setup";
import { firemix } from "@firemix/mixed";
import { mixpath } from "@repo/firemix";

beforeAll(setUp);
afterAll(tearDown);

const config = {
  freeWordsPerDay: 1000,
  freeWordsPerMonth: 10_000,
  proWordsPerDay: 10_000,
  proWordsPerMonth: 100_000,
};

beforeAll(async () => {
  await firemix().set(mixpath.systemConfig(), config);
});

describe("voice/transcribe", () => {
  it("blocks access if you exceeded your daily word limit", async () => {
    const creds = await createUserCreds();
    await signInWithCreds(creds);
    await invokeHandler("member/tryInitialize", {});

    await firemix().update(mixpath.members(creds.id), {
      wordsToday: config.freeWordsPerDay + 1,
      wordsTodayResetAt: firemix().timestampFromDate(
        dayjs().subtract(1, "day").toDate()
      ),
    });

    await expect(
      invokeHandler("voice/transcribe", {
        audioBase64: "dGVzdA==",
        audioMimeType: "audio/wav",
        simulate: true,
      })
    ).rejects.toThrow("You have exceeded your word limit");
  });

  it("lets you transcribe if you're a pro user", async () => {
    const creds = await createUserCreds();
    await signInWithCreds(creds);
    await invokeHandler("member/tryInitialize", {});

    await firemix().update(mixpath.members(creds.id), {
      plan: "pro",
      wordsToday: config.freeWordsPerDay + 1,
      wordsTodayResetAt: firemix().timestampFromDate(
        dayjs().subtract(1, "day").toDate()
      ),
    });

    const res = await invokeHandler("voice/transcribe", {
      audioBase64: "dGVzdA==",
      audioMimeType: "audio/wav",
      simulate: true,
    });

    expect(res.text).toBeDefined();
    expect(res.text.length).toBeGreaterThan(0);
    expect(res.text).toContain("Simulated response");
  });

  it("blocks access if you exceeded your monthly word limit", async () => {
    const creds = await createUserCreds();
    await signInWithCreds(creds);
    await invokeHandler("member/tryInitialize", {});

    await firemix().update(mixpath.members(creds.id), {
      wordsThisMonth: config.freeWordsPerMonth + 1,
      wordsThisMonthResetAt: firemix().timestampFromDate(
        dayjs().subtract(1, "month").toDate()
      ),
    });

    await expect(
      invokeHandler("voice/transcribe", {
        audioBase64: "dGVzdA==",
        audioMimeType: "audio/wav",
        simulate: true,
      })
    ).rejects.toThrow("You have exceeded your word limit");
  });

  it("allows access and increments word count", async () => {
    const creds = await createUserCreds();
    await signInWithCreds(creds);
    await invokeHandler("member/tryInitialize", {});

    await firemix().update(mixpath.members(creds.id), {
      wordsToday: 10,
      wordsThisMonth: 100,
      wordsTotal: 1000,
      wordsTodayResetAt: firemix().timestampFromDate(
        dayjs().subtract(1, "day").toDate()
      ),
      wordsThisMonthResetAt: firemix().timestampFromDate(
        dayjs().subtract(1, "month").toDate()
      ),
    });

    const res = await invokeHandler("voice/transcribe", {
      audioBase64: "dGVzdA==",
      audioMimeType: "audio/wav",
      simulate: true,
    });

    expect(res.text).toBeDefined();
    expect(res.text.length).toBeGreaterThan(0);
    expect(res.text).toContain("Simulated response");

    const newMember = await firemix().get(mixpath.members(creds.id));
    expect(newMember?.data.wordsToday).toBe(12);
    expect(newMember?.data.wordsThisMonth).toBe(102);
    expect(newMember?.data.wordsTotal).toBe(1002);
    expect(newMember?.data.updatedAt).toBeDefined();
  });
});

describe("voice/compose", () => {
  it("blocks access if you exceeded your daily word limit", async () => {
    const creds = await createUserCreds();
    await signInWithCreds(creds);
    await invokeHandler("member/tryInitialize", {});

    await firemix().update(mixpath.members(creds.id), {
      wordsToday: config.freeWordsPerDay + 1,
      wordsTodayResetAt: firemix().timestampFromDate(
        dayjs().subtract(1, "day").toDate()
      ),
    });

    await expect(
      invokeHandler("voice/compose", {
        audioBase64: "dGVzdA==",
        audioMimeType: "audio/wav",
        simulate: true,
      })
    ).rejects.toThrow("You have exceeded your word limit");
  });

  it("lets you compose if you're a pro user", async () => {
    const creds = await createUserCreds();
    await signInWithCreds(creds);
    await invokeHandler("member/tryInitialize", {});

    await firemix().update(mixpath.members(creds.id), {
      plan: "pro",
      wordsToday: config.freeWordsPerDay + 1,
      wordsTodayResetAt: firemix().timestampFromDate(
        dayjs().subtract(1, "day").toDate()
      ),
    });

    const res = await invokeHandler("voice/compose", {
      audioBase64: "dGVzdA==",
      audioMimeType: "audio/wav",
      simulate: true,
    });

    expect(res.text).toBeDefined();
    expect(res.text.length).toBeGreaterThan(0);
    expect(res.text).toContain("Simulated response");
  });

  it("blocks access if you exceeded your monthly word limit", async () => {
    const creds = await createUserCreds();
    await signInWithCreds(creds);
    await invokeHandler("member/tryInitialize", {});

    await firemix().update(mixpath.members(creds.id), {
      wordsThisMonth: config.freeWordsPerMonth + 1,
      wordsThisMonthResetAt: firemix().timestampFromDate(
        dayjs().subtract(1, "month").toDate()
      ),
    });

    await expect(
      invokeHandler("voice/compose", {
        audioBase64: "dGVzdA==",
        audioMimeType: "audio/wav",
        simulate: true,
      })
    ).rejects.toThrow("You have exceeded your word limit");
  });

  it("allows access and increments word count", async () => {
    const creds = await createUserCreds();
    await signInWithCreds(creds);
    await invokeHandler("member/tryInitialize", {});

    await firemix().update(mixpath.members(creds.id), {
      wordsToday: 10,
      wordsThisMonth: 100,
      wordsTotal: 1000,
      wordsTodayResetAt: firemix().timestampFromDate(
        dayjs().subtract(1, "day").toDate()
      ),
      wordsThisMonthResetAt: firemix().timestampFromDate(
        dayjs().subtract(1, "month").toDate()
      ),
    });

    const res = await invokeHandler("voice/compose", {
      audioBase64: "dGVzdA==",
      audioMimeType: "audio/wav",
      simulate: true,
    });

    expect(res.text).toBeDefined();
    expect(res.text.length).toBeGreaterThan(0);
    expect(res.text).toContain("Simulated response");

    const newMember = await firemix().get(mixpath.members(creds.id));
    expect(newMember?.data.wordsToday).toBe(12);
    expect(newMember?.data.wordsThisMonth).toBe(102);
    expect(newMember?.data.wordsTotal).toBe(1002);
    expect(newMember?.data.updatedAt).toBeDefined();
  });
});
