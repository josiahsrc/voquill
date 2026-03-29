import { FullConfig, Member, MemberPlan } from "@voquill/types";

export const TRIAL_DURATION_DAYS = 7;

export const getMemberExceedsWordLimit = (
  member: Member,
  config: FullConfig,
): boolean => {
  const limits = getWordLimit(config, member.plan);
  return (
    member.wordsToday >= limits.perDay ||
    (member.wordsThisWeek ?? 0) >= limits.perWeek ||
    member.wordsThisMonth >= limits.perMonth
  );
};

export const getMemberExceedsTokenLimit = (
  member: Member,
  config: FullConfig,
): boolean => {
  const limits = getTokenLimit(config, member.plan);
  return (
    member.tokensToday >= limits.perDay ||
    (member.tokensThisWeek ?? 0) >= limits.perWeek ||
    member.tokensThisMonth >= limits.perMonth
  );
};

export const getMemberExceedsLimits = (
  member: Member,
  config: FullConfig,
): boolean => {
  return (
    getMemberExceedsWordLimit(member, config) ||
    getMemberExceedsTokenLimit(member, config)
  );
};

export type Limit = {
  perDay: number;
  perWeek: number;
  perMonth: number;
};

export const getWordLimit = (config: FullConfig, plan: MemberPlan): Limit => {
  if (plan === "pro") {
    return {
      perDay: config.proWordsPerDay,
      perWeek: config.proWordsPerWeek,
      perMonth: config.proWordsPerMonth,
    };
  } else {
    return {
      perDay: config.freeWordsPerDay,
      perWeek: config.freeWordsPerWeek,
      perMonth: config.freeWordsPerMonth,
    };
  }
};

export const getTokenLimit = (config: FullConfig, plan: MemberPlan): Limit => {
  if (plan === "pro") {
    return {
      perDay: config.proTokensPerDay,
      perWeek: config.proTokensPerWeek,
      perMonth: config.proTokensPerMonth,
    };
  } else {
    return {
      perDay: config.freeTokensPerDay,
      perWeek: config.freeTokensPerWeek,
      perMonth: config.freeTokensPerMonth,
    };
  }
};
