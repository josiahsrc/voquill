import { Member, MemberPlan, Nullable } from "@repo/types";
import { getRec } from "@repo/utilities";
import type { AppState } from "../state/app.state";

export const getMyMember = (state: AppState): Nullable<Member> => {
  return getRec(state.memberById, state.auth?.uid) ?? null;
};

export const getEffectivePlan = (state: AppState): MemberPlan => {
  return getMyMember(state)?.plan ?? "free";
}

export const planToDisplayName = (plan: MemberPlan): string => {
  if (plan === "free") {
    return "Community";
  } else {
    return "Pro";
  }
};

export const getIsPaying = (state: AppState): boolean => {
  const member = getMyMember(state);
  if (!member) {
    return false;
  }

  return member.plan !== "free";
};
