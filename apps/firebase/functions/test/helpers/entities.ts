import { Member, Term, User } from "@repo/types";

export const buildMember = (overrides?: Partial<Member>): Member => ({
	id: "defaultMemberId",
	type: "user",
	createdAt: "2023-01-01T00:00:00Z",
	updatedAt: "2023-01-01T00:00:00Z",
	stripeCustomerId: "123",
	priceId: null,
	plan: "free",
	tokensToday: 0,
	tokensThisMonth: 0,
	tokensTotal: 0,
	thisMonthResetAt: "2023-01-01T00:00:00Z",
	wordsToday: 0,
	todayResetAt: "2023-01-01T00:00:00Z",
	wordsThisMonth: 0,
	wordsTotal: 0,
	...overrides,
});

export const buildUser = (overrides?: Partial<User>): User => ({
	id: "defaultUserId",
	createdAt: "2023-01-01T00:00:00Z",
	updatedAt: "2023-01-01T00:00:00Z",
	name: "Test User",
	onboarded: false,
	onboardedAt: null,
	preferredMicrophone: null,
	playInteractionChime: true,
	hasFinishedTutorial: false,
	wordsThisMonth: 0,
	wordsThisMonthMonth: "yyyy-MM",
	wordsTotal: 0,
	...overrides,
});

export const buildTerm = (overrides?: Partial<Term>): Term => ({
	id: "defaultTermId",
	createdAt: "2023-01-01T00:00:00Z",
	sourceValue: "default source",
	destinationValue: "default destination",
	isReplacement: true,
	...overrides,
});
