import { firemix } from "@firemix/mixed";
import { mixpath } from "@repo/firemix";
import { HandlerInput, HandlerOutput } from "@repo/functions";
import { Member, Nullable } from "@repo/types";
import dayjs from "dayjs";
import { AuthData } from "firebase-functions/tasks";
import { checkAccess } from "../utils/check.utils";
import { sendLoopsEvent, updateLoopsContact } from "../utils/loops.utils";
import { tryInitializeMember } from "../utils/member.utils";
import { memberFromDatabase } from "../utils/type.utils";

export const handleTryInitializeMember = async (args: {
  auth: Nullable<AuthData>;
  input: HandlerInput<"member/tryInitialize">;
}): Promise<HandlerOutput<"member/tryInitialize">> => {
  const access = await checkAccess(args.auth);
  await tryInitializeMember(access.auth.uid);
  return {};
};

export const handleResetLimitsToday = async (): Promise<void> => {
  const now = firemix().now();
  const expiration = dayjs().add(1, "day").toDate();

  const members = await firemix().query(mixpath.members(), [
    "where",
    "todayResetAt",
    "<=",
    now,
  ]);

  await firemix().executeBatchWrite(
    members.map(
      (member) => (b) =>
        b.update(mixpath.members(member.id), {
          wordsToday: 0,
          tokensToday: 0,
          todayResetAt: firemix().timestampFromDate(expiration),
        })
    )
  );
};

export const handleResetLimitsThisMonth = async (): Promise<void> => {
  const now = firemix().now();
  const expiration = dayjs().add(1, "month").toDate();

  const members = await firemix().query(mixpath.members(), [
    "where",
    "thisMonthResetAt",
    "<=",
    now,
  ]);

  await firemix().executeBatchWrite(
    members.map(
      (member) => (b) =>
        b.update(mixpath.members(member.id), {
          wordsThisMonth: 0,
          tokensThisMonth: 0,
          thisMonthResetAt: firemix().timestampFromDate(expiration),
        })
    )
  );
};

export const tryUpdateMemberLoopsContact = async (args: {
  before: Nullable<Member>;
  after: Nullable<Member>;
}) => {
  const prevPlan = args.before?.plan;
  const newPlan = args.after?.plan;
  if (prevPlan === newPlan) {
    return;
  }

  const userId = args.after?.id ?? args.before?.id;
  if (!userId) {
    return;
  }

  await updateLoopsContact(userId);
  console.log("updated loops contact name for user", userId);
};

export const trySend1000WordsEvent = async (args: {
  before: Nullable<Member>;
  after: Nullable<Member>;
}): Promise<void> => {
  const prevWordsTotal = args.before?.wordsTotal ?? 0;
  const newWordsTotal = args.after?.wordsTotal ?? 0;
  if (prevWordsTotal >= 1000 || newWordsTotal < 1000) {
    return;
  }

  const userId = args.after?.id ?? args.before?.id;
  if (!userId) {
    return;
  }

  await sendLoopsEvent({
    userId: userId,
    eventName: "dictated-1000-words",
  });

  console.log("sent dictated-1000-words event for user", userId);
};

export const getMyMember = async (args: {
  auth: Nullable<AuthData>;
}): Promise<HandlerOutput<"member/getMyMember">> => {
  const access = await checkAccess(args.auth);
  const member = await firemix().get(mixpath.members(access.auth.uid));
  return {
    member: member?.data ? memberFromDatabase(member.data) : null,
  };
};
