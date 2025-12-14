import { Member, Nullable } from "@repo/types";
import { getMemberExceedsLimits, getRec } from "@repo/utilities";
import { getIntl } from "../i18n";
import type { AppState } from "../state/app.state";
import { EffectivePlan } from "../types/member.types";

export const getMyMember = (state: AppState): Nullable<Member> => {
  return getRec(state.memberById, state.auth?.uid) ?? null;
};

export const getEffectivePlan = (state: AppState): EffectivePlan => {
  return getMyMember(state)?.plan ?? "community";
};

export const planToDisplayName = (plan: EffectivePlan): string => {
  if (plan === "community") {
    return getIntl().formatMessage({ defaultMessage: "Community" });
  } else if (plan === "free") {
    return getIntl().formatMessage({ defaultMessage: "Trial" });
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
};

export const getIsPaying = (state: AppState): boolean => {
  const member = getMyMember(state);
  if (!member) {
    return false;
  }

  return member.plan !== "free";
};
