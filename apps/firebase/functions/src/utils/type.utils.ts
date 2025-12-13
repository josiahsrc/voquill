import { firemix } from "@firemix/mixed";
import { DatabaseMember, DatabaseTerm, DatabaseUser, Member, Term, User } from "@repo/types";

export const userToDatabase = (user: User): DatabaseUser => ({
  ...user,
  hasFinishedTutorial: user.hasFinishedTutorial ?? false,
  createdAt: firemix().timestampFromDate(new Date(user.createdAt)),
  updatedAt: firemix().timestampFromDate(new Date(user.updatedAt)),
  onboardedAt: user.onboardedAt ? firemix().timestampFromDate(new Date(user.onboardedAt)) : null,
});

export const userFromDatabase = (dbUser: DatabaseUser): User => ({
  ...dbUser,
  createdAt: dbUser.createdAt.toDate().toISOString(),
  updatedAt: dbUser.updatedAt.toDate().toISOString(),
  onboardedAt: dbUser.onboardedAt ? dbUser.onboardedAt.toDate().toISOString() : null,
  hasFinishedTutorial: dbUser.hasFinishedTutorial ?? false,
});

export const memberToDatabase = (member: Member): DatabaseMember => ({
  ...member,
  createdAt: firemix().timestampFromDate(new Date(member.createdAt)),
  updatedAt: firemix().timestampFromDate(new Date(member.updatedAt)),
  todayResetAt: firemix().timestampFromDate(new Date(member.todayResetAt)),
  thisMonthResetAt: firemix().timestampFromDate(new Date(member.thisMonthResetAt)),
});

export const memberFromDatabase = (dbMember: DatabaseMember): Member => ({
  ...dbMember,
  createdAt: dbMember.createdAt.toDate().toISOString(),
  updatedAt: dbMember.updatedAt.toDate().toISOString(),
  todayResetAt: dbMember.todayResetAt.toDate().toISOString(),
  thisMonthResetAt: dbMember.thisMonthResetAt.toDate().toISOString(),
});

export const termToDatabase = (term: Term): DatabaseTerm => ({
  ...term,
  createdAt: firemix().timestampFromDate(new Date(term.createdAt)),
});

export const termFromDatabase = (dbTerm: DatabaseTerm): Term => ({
  ...dbTerm,
  createdAt: dbTerm.createdAt.toDate().toISOString(),
});
