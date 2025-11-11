import dayjs from "dayjs";
import { firemix } from "@firemix/mixed";
import { invokeHandler } from "@repo/functions";
import { mixpath } from "@repo/firemix";
import { retry } from "@repo/utilities";
import { createUserCreds, markUserAsSubscribed, signInWithCreds } from "../helpers/firebase";
import { buildSilenceWavBase64 } from "../helpers/audio";
import { setUp, tearDown } from "../helpers/setup";
import { getFullConfig } from "../../src/utils/config.utils";

beforeAll(setUp);
afterAll(tearDown);

const SHORT_AUDIO_BASE64 = buildSilenceWavBase64(5, 8_000);

type MemberCreds = {
  id: string;
};

const createMember = async (): Promise<MemberCreds> => {
  const creds = await createUserCreds();
  await signInWithCreds(creds);
  await markUserAsSubscribed();
  await invokeHandler("member/tryInitialize", {});
  return { id: creds.id };
};

describe("ai endpoints integration", () => {
  let member: MemberCreds;

  beforeEach(async () => {
    member = await createMember();
    await firemix().update(mixpath.members(member.id), {
      plan: "pro",
      wordsToday: 5,
      wordsThisMonth: 50,
      wordsTotal: 500,
      tokensToday: 10,
      tokensThisMonth: 100,
      tokensTotal: 1_000,
      todayResetAt: firemix().timestampFromDate(
        dayjs().subtract(1, "day").toDate()
      ),
      thisMonthResetAt: firemix().timestampFromDate(
        dayjs().subtract(1, "month").toDate()
      ),
    });
  });

  it("updates usage counters across transcription and generation and supports resets", async () => {
    const transcription = await invokeHandler("ai/transcribeAudio", {
      audioBase64: SHORT_AUDIO_BASE64,
      audioMimeType: "audio/wav",
      simulate: true,
    });

    expect(transcription.text).toBe("Simulated response");

    let memberSnap = await firemix().get(mixpath.members(member.id));
    expect(memberSnap?.data.wordsToday).toBe(7);
    expect(memberSnap?.data.wordsThisMonth).toBe(52);
    expect(memberSnap?.data.wordsTotal).toBe(502);
    expect(memberSnap?.data.tokensToday).toBe(10);
    expect(memberSnap?.data.tokensThisMonth).toBe(100);

    const completion = await invokeHandler("ai/generateText", {
      prompt: "Explain how the system tracks usage.",
      simulate: true,
    });

    expect(completion.text).toBe("Simulated generated text.");

    memberSnap = await firemix().get(mixpath.members(member.id));
    expect(memberSnap?.data.tokensToday).toBe(13);
    expect(memberSnap?.data.tokensThisMonth).toBe(103);
    expect(memberSnap?.data.tokensTotal).toBe(1_003);
    expect(memberSnap?.data.wordsToday).toBe(7);
    expect(memberSnap?.data.wordsThisMonth).toBe(52);

    // trigger daily reset
    await invokeHandler("emulator/resetWordsToday", {});

    await retry({
      retries: 10,
      delay: 500,
      fn: async () => {
        const updated = await firemix().get(mixpath.members(member.id));
        expect(updated?.data.wordsToday).toBe(0);
        expect(updated?.data.tokensToday).toBe(0);
        const resetAt = updated?.data.todayResetAt.toMillis();
        expect(resetAt).toBeGreaterThanOrEqual(
          dayjs().add(1, "day").subtract(1, "minute").toDate().getTime()
        );
        expect(resetAt).toBeLessThanOrEqual(
          dayjs().add(1, "day").add(1, "minute").toDate().getTime()
        );
      },
    });

    // trigger monthly reset
    await invokeHandler("emulator/resetWordsThisMonth", {});

    await retry({
      retries: 10,
      delay: 500,
      fn: async () => {
        const updated = await firemix().get(mixpath.members(member.id));
        expect(updated?.data.wordsThisMonth).toBe(0);
        expect(updated?.data.tokensThisMonth).toBe(0);
        const resetAt = updated?.data.thisMonthResetAt.toMillis();
        expect(resetAt).toBeGreaterThanOrEqual(
          dayjs().add(1, "month").subtract(1, "minute").toDate().getTime()
        );
        expect(resetAt).toBeLessThanOrEqual(
          dayjs().add(1, "month").add(1, "minute").toDate().getTime()
        );
        // totals should remain incremented
        expect(updated?.data.wordsTotal).toBe(502);
        expect(updated?.data.tokensTotal).toBe(1_003);
      },
    });
  });

  it("prevents usage when limits are exceeded", async () => {
    await firemix().update(mixpath.members(member.id), {
      wordsToday: getFullConfig().proWordsPerDay,
      tokensToday: -1,
    });

    await expect(
      invokeHandler("ai/transcribeAudio", {
        audioBase64: SHORT_AUDIO_BASE64,
        audioMimeType: "audio/wav",
        simulate: true,
      })
    ).rejects.toThrow("You have exceeded your word limit");

    await firemix().update(mixpath.members(member.id), {
      wordsToday: -1,
      tokensToday: getFullConfig().proTokensPerDay,
    });

    await expect(
      invokeHandler("ai/generateText", {
        prompt: "Say hello",
        simulate: true,
      })
    ).rejects.toThrow("You have exceeded your token limit");
  });
});
