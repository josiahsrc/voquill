import { firemix } from "@firemix/mixed";
import { Member, Term, User } from "@repo/types";

export const buildMember = (overrides?: Partial<Member>): Member => ({
  id: "defaultMemberId",
  type: "user",
  createdAt: firemix().timestampFromDate(new Date("2023-01-01T00:00:00Z")),
  updatedAt: firemix().timestampFromDate(new Date("2023-01-01T00:00:00Z")),
  stripeCustomerId: "123",
  priceId: null,
  userIds: ["defaultUserId"],
  plan: "free",
  tokensToday: 0,
  tokensThisMonth: 0,
  tokensTotal: 0,
  thisMonthResetAt: firemix().timestampFromDate(
    new Date("2023-01-01T00:00:00Z")
  ),
  wordsToday: 0,
  todayResetAt: firemix().timestampFromDate(
    new Date("2023-01-01T00:00:00Z")
  ),
  wordsThisMonth: 0,
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
  playInteractionChime: true,
  wordsThisMonth: 0,
  wordsThisMonthMonth: 'yyyy-MM',
  wordsTotal: 0,
  ...overrides,
});

export const buildTerm = (overrides?: Partial<Term>): Term => ({
  id: "defaultTermId",
  createdByUserId: "defaultUserId",
  createdAt: firemix().timestampFromDate(new Date("2023-01-01T00:00:00Z")),
  sourceValue: "default source",
  destinationValue: "default destination",
  isReplacement: true,
  isDeleted: false,
  ...overrides,
});
