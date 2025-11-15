import { Member, MemberPlan, Nullable } from "@repo/types";
import { getMemberExceedsLimits, getRec } from "@repo/utilities";
import type { AppState } from "../state/app.state";
import { getIntl } from "../i18n";

export const getMyMember = (state: AppState): Nullable<Member> => {
  return getRec(state.memberById, state.auth?.uid) ?? null;
};

export const getEffectivePlan = (state: AppState): MemberPlan => {
  return getMyMember(state)?.plan ?? "free";
}

export const planToDisplayName = (plan: MemberPlan): string => {
  if (plan === "free") {
    return getIntl().formatMessage({ defaultMessage: "Community" });
  } else {
    return getIntl().formatMessage({ defaultMessage: "Pro" });
  }
};

export const getMemberExceedsLimitsFromState = (state: AppState): boolean => {
  const config = state.config;
  const member = getMyMember(state);
  if (!member || !config) {
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
