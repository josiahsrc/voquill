import { FullConfig, Member, MemberPlan } from "@repo/types";

export const getMemberExceedsWordLimit = (
  member: Member,
  config: FullConfig
): boolean => {
  const limits = getWordLimit(config, member.plan);
  return (
    member.wordsToday >= limits.perDay ||
    member.wordsThisMonth >= limits.perMonth
  );
};

export const getMemberExceedsTokenLimit = (
  member: Member,
  config: FullConfig
): boolean => {
  const limits = getTokenLimit(config, member.plan);
  return (
    member.tokensToday >= limits.perDay ||
    member.tokensThisMonth >= limits.perMonth
  );
}

export const getMemberExceedsLimits = (member: Member, config: FullConfig): boolean => {
  return (
    getMemberExceedsWordLimit(member, config) ||
    getMemberExceedsTokenLimit(member, config)
  );
}

export type Limit = {
  perDay: number;
  perMonth: number;
};

export const getWordLimit = (
  config: FullConfig,
  plan: MemberPlan,
): Limit => {
  if (plan === "pro") {
    return {
      perDay: config.proWordsPerDay,
      perMonth: config.proWordsPerMonth,
    };
  } else {
    return {
      perDay: config.freeWordsPerDay,
      perMonth: config.freeWordsPerMonth,
    };
  }
};

export const getTokenLimit = (
  config: FullConfig,
  plan: MemberPlan,
): Limit => {
  if (plan === "pro") {
    return {
      perDay: config.proTokensPerDay,
      perMonth: config.proTokensPerMonth,
    };
  } else {
    return {
      perDay: config.freeTokensPerDay,
      perMonth: config.freeTokensPerMonth,
    };
  }
};
