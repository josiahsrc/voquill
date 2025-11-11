import dayjs from "dayjs";
import { invokeHandler } from "@repo/functions";
import { createUserCreds, signInWithCreds } from "../helpers/firebase";
import { setUp, tearDown } from "../helpers/setup";
import { firemix } from "@firemix/mixed";
import { mixpath } from "@repo/firemix";
import { retry } from "@repo/utilities";
import { buildMember } from "../helpers/entities";
import { memberToDatabase } from "../../src/utils/type.utils";

beforeAll(setUp);
afterAll(tearDown);

describe("tryInitializeMember", () => {
  it("works", async () => {
    const creds = await createUserCreds();
    await signInWithCreds(creds);

    // auth creates the member as a fallback
    await retry({
      fn: async () => {
        const memberSnap = await firemix().get(mixpath.members(creds.id));
        expect(memberSnap).toBeDefined();
        expect(memberSnap?.data).toBeDefined();
        expect(memberSnap?.data.id).toBe(creds.id);
      },
      retries: 10,
      delay: 100
    });

    // delete the member
    await firemix().delete(mixpath.members(creds.id));

    // confirm it's deleted
    const prevMemberSnap = await firemix().get(mixpath.members(creds.id));
    expect(prevMemberSnap).toBeNull();

    // call tryInitializeMember directly
    await expect(
      invokeHandler("member/tryInitialize", {})
    ).resolves.not.toThrow();

    // confirm the member is re-created
    const memberSnap = await firemix().get(mixpath.members(creds.id));
    expect(memberSnap).toBeDefined();
    expect(memberSnap?.data).toBeDefined();
    expect(memberSnap?.data.id).toBe(creds.id);
  });
});

describe("resetWordsTodayCron", () => {
  it("should work", async () => {
    const expiredMember = memberToDatabase(buildMember({
      id: firemix().id(),
      wordsToday: 100,
      todayResetAt: dayjs().subtract(1, "day").toISOString(),
    }));

    const notExpiredMember = memberToDatabase(buildMember({
      id: firemix().id(),
      wordsToday: 50,
      todayResetAt: dayjs().add(1, "day").toISOString(),
    }));

    await firemix().set(mixpath.members(expiredMember.id), expiredMember);
    await firemix().set(mixpath.members(notExpiredMember.id), notExpiredMember);

    await invokeHandler("emulator/resetWordsToday", {});

    await retry({
      fn: async () => {
        const expiredMemberSnap = await firemix().get(
          mixpath.members(expiredMember.id)
        );

        // expired member should be reset
        expect(expiredMemberSnap?.data.wordsToday).toBe(0);
        expect(
          expiredMemberSnap?.data.todayResetAt.toMillis()
        ).toBeGreaterThanOrEqual(
          dayjs().add(1, "day").subtract(1, "minute").toDate().getTime()
        );
        expect(
          expiredMemberSnap?.data.todayResetAt.toMillis()
        ).toBeLessThanOrEqual(
          dayjs().add(1, "day").add(1, "minute").toDate().getTime()
        );

        // non expired member should not be changed
        const notExpiredMemberSnap = await firemix().get(
          mixpath.members(notExpiredMember.id)
        );
        expect(notExpiredMemberSnap?.data.wordsToday).toBe(50);
        expect(
          notExpiredMemberSnap?.data.thisMonthResetAt?.toDate().toISOString()
        ).toEqual(notExpiredMember.thisMonthResetAt?.toDate().toISOString());
      },
      retries: 10,
      delay: 1000
    });
  });
});

describe("resetWordsThisMonthCron", () => {
  it("should work", async () => {
    const expiredMember = memberToDatabase(buildMember({
      id: firemix().id(),
      wordsThisMonth: 5000,
      thisMonthResetAt: dayjs().subtract(1, "month").toISOString(),
    }));

    const notExpiredMember = memberToDatabase(buildMember({
      id: firemix().id(),
      wordsThisMonth: 2500,
      thisMonthResetAt: dayjs().add(1, "month").toISOString(),
    }));

    await firemix().set(mixpath.members(expiredMember.id), expiredMember);
    await firemix().set(mixpath.members(notExpiredMember.id), notExpiredMember);

    await invokeHandler("emulator/resetWordsThisMonth", {});

    await retry({
      fn: async () => {
        const expiredMemberSnap = await firemix().get(
          mixpath.members(expiredMember.id)
        );

        // expired member should be reset
        expect(expiredMemberSnap?.data.wordsThisMonth).toBe(0);
        expect(
          expiredMemberSnap?.data.thisMonthResetAt.toMillis()
        ).toBeGreaterThanOrEqual(
          dayjs().add(1, "month").subtract(1, "minute").toDate().getTime()
        );
        expect(
          expiredMemberSnap?.data.thisMonthResetAt.toMillis()
        ).toBeLessThanOrEqual(
          dayjs().add(1, "month").add(1, "minute").toDate().getTime()
        );

        // non expired member should not be changed
        const notExpiredMemberSnap = await firemix().get(
          mixpath.members(notExpiredMember.id)
        );
        expect(notExpiredMemberSnap?.data.wordsThisMonth).toBe(2500);
        expect(
          notExpiredMemberSnap?.data.thisMonthResetAt.toDate().toISOString()
        ).toEqual(notExpiredMember.thisMonthResetAt.toDate().toISOString());
      },
      retries: 10,
      delay: 1000
    });
  });
});

describe("api", () => {
  it("lets me manage my member", async () => {
    const creds = await createUserCreds();
    await signInWithCreds(creds);
    await invokeHandler("member/tryInitialize", {});
    const myMember = await invokeHandler("member/getMyMember", {}).then(res => res.member);
    expect(myMember).not.toBeNull();
    expect(myMember?.id).toBe(creds.id);
  });
});
