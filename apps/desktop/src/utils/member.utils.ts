import { Member, MemberPlan, Nullable } from "@repo/types";
import { getFullConfig, getMemberExceedsLimits, getRec } from "@repo/utilities";
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

export const getMemberExceedsLimitsFromState = (state: AppState): boolean => {
  const config = getFullConfig(state.config);
  const member = getMyMember(state);
  if (!member) {
    return true;
  }

  return getMemberExceedsLimits(member, config);
}

export const getIsPaying = (state: AppState): boolean => {
  const member = getMyMember(state);
  if (!member) {
    return false;
  }

  return member.plan !== "free";
};
