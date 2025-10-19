import { firemix } from "@firemix/mixed";
import { Member, User } from "@repo/types";

export const buildMember = (overrides?: Partial<Member>): Member => ({
  id: "defaultMemberId",
  type: "user",
  createdAt: firemix().timestampFromDate(new Date("2023-01-01T00:00:00Z")),
  updatedAt: firemix().timestampFromDate(new Date("2023-01-01T00:00:00Z")),
  stripeCustomerId: "123",
  priceId: null,
  userIds: ["defaultUserId"],
  plan: "free",
  wordsToday: 0,
  wordsTodayResetAt: firemix().timestampFromDate(
    new Date("2023-01-01T00:00:00Z")
  ),
  wordsThisMonth: 0,
  wordsThisMonthResetAt: firemix().timestampFromDate(
    new Date("2023-01-01T00:00:00Z")
  ),
  wordsTotal: 0,
  ...overrides,
});

export const buildUser = (overrides?: Partial<User>): User => ({
  id: "defaultUserId",
  createdAt: firemix().timestampFromDate(new Date("2023-01-01T00:00:00Z")),
  updatedAt: firemix().timestampFromDate(new Date("2023-01-01T00:00:00Z")),
  name: "Test User",
  onboarded: false,
  onboardedAt: null,
  preferredMicrophone: null,
  ...overrides,
});
