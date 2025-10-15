import { AuthData } from "firebase-functions/tasks";
import { HandlerInput, HandlerOutput } from "@repo/functions";
import { UnauthenticatedError } from "../utils/error.utils";
import { tryInitializeMember } from "../utils/member.utils";
import dayjs from "dayjs";
import { sendLoopsEvent, updateLoopsContact } from "../utils/loops.utils";
import { firemix } from "@firemix/mixed";
import { Member, Nullable } from "@repo/types";
import { mixpath } from "@repo/firemix";

export const handleTryInitializeMember = async (args: {
  auth: Nullable<AuthData>;
  input: HandlerInput<"member/tryInitialize">;
}): Promise<HandlerOutput<"member/tryInitialize">> => {
  const userId = args.auth?.uid;
  if (!userId) {
    console.log("no auth data provided");
    throw new UnauthenticatedError("You must be authenticated");
  }

  await tryInitializeMember(userId);
  return {};
};

export const handleResetWordsToday = async (): Promise<void> => {
  const now = firemix().now();
  const expiration = dayjs().add(1, "day").toDate();

  const members = await firemix().query(mixpath.members(), [
    "where",
    "wordsTodayResetAt",
    "<=",
    now,
  ]);

  await firemix().executeBatchWrite(
    members.map(
      (member) => (b) =>
        b.update(mixpath.members(member.id), {
          wordsToday: 0,
          wordsTodayResetAt: firemix().timestampFromDate(expiration),
        })
    )
  );
};

export const handleResetWordsThisMonth = async (): Promise<void> => {
  const now = firemix().now();
  const expiration = dayjs().add(1, "month").toDate();

  const members = await firemix().query(mixpath.members(), [
    "where",
    "wordsThisMonthResetAt",
    "<=",
    now,
  ]);

  await firemix().executeBatchWrite(
    members.map(
      (member) => (b) =>
        b.update(mixpath.members(member.id), {
          wordsThisMonth: 0,
          wordsThisMonthResetAt: firemix().timestampFromDate(expiration),
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

  const userIds = args.after?.userIds ?? [];
  for (const userId of userIds) {
    await updateLoopsContact(userId);
    console.log("updated loops contact name for user", userId);
  }
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

  const userIds = args.after?.userIds ?? [];
  for (const userId of userIds) {
    await sendLoopsEvent({
      userId: userId,
      eventName: "dictated-1000-words",
    });
    console.log("sent dictated-1000-words event for user", userId);
  }
};
