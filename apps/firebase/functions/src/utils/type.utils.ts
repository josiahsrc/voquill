import { firemix } from "@firemix/mixed";
import {
	DatabaseMember,
	DatabaseTerm,
	DatabaseTone,
	DatabaseUser,
	Member,
	Term,
	Tone,
	User,
} from "@repo/types";

export const userToDatabase = (user: User): DatabaseUser => ({
	...user,
	hasFinishedTutorial: user.hasFinishedTutorial ?? false,
	createdAt: firemix().timestampFromDate(new Date(user.createdAt)),
	updatedAt: firemix().timestampFromDate(new Date(user.updatedAt)),
	onboardedAt: user.onboardedAt
		? firemix().timestampFromDate(new Date(user.onboardedAt))
		: null,
});

export const userFromDatabase = (dbUser: DatabaseUser): User => ({
	...dbUser,
	createdAt: dbUser.createdAt.toDate().toISOString(),
	updatedAt: dbUser.updatedAt.toDate().toISOString(),
	onboardedAt: dbUser.onboardedAt
		? dbUser.onboardedAt.toDate().toISOString()
		: null,
	hasFinishedTutorial: dbUser.hasFinishedTutorial ?? false,
});

export const memberToDatabase = (member: Member): DatabaseMember => ({
	...member,
	createdAt: firemix().timestampFromDate(new Date(member.createdAt)),
	updatedAt: firemix().timestampFromDate(new Date(member.updatedAt)),
	todayResetAt: firemix().timestampFromDate(new Date(member.todayResetAt)),
	thisMonthResetAt: firemix().timestampFromDate(
		new Date(member.thisMonthResetAt),
	),
	trialEndsAt: member.trialEndsAt
		? firemix().timestampFromDate(new Date(member.trialEndsAt))
		: null,
});

export const memberFromDatabase = (dbMember: DatabaseMember): Member => ({
	...dbMember,
	createdAt: dbMember.createdAt.toDate().toISOString(),
	updatedAt: dbMember.updatedAt.toDate().toISOString(),
	todayResetAt: dbMember.todayResetAt.toDate().toISOString(),
	thisMonthResetAt: dbMember.thisMonthResetAt.toDate().toISOString(),
	trialEndsAt: dbMember.trialEndsAt
		? dbMember.trialEndsAt.toDate().toISOString()
		: null,
});

export const termToDatabase = (term: Term): DatabaseTerm => ({
	...term,
	createdAt: firemix().timestampFromDate(new Date(term.createdAt)),
});

export const termFromDatabase = (dbTerm: DatabaseTerm): Term => ({
	...dbTerm,
	createdAt: dbTerm.createdAt.toDate().toISOString(),
});

export const toneToDatabase = (tone: Tone): DatabaseTone => ({
	...tone,
	createdAt: firemix().timestampFromDate(new Date(tone.createdAt)),
});

export const toneFromDatabase = (dbTone: DatabaseTone): Tone => ({
	...dbTone,
	createdAt: dbTone.createdAt.toDate().getTime(),
});

