import { firemix } from "@firemix/mixed";
import { DatabaseMember, DatabaseUser, Member, User } from "@repo/types";

export const userToDatabase = (user: User): DatabaseUser => ({
  ...user,
  createdAt: firemix().timestampFromDate(new Date(user.createdAt)),
  updatedAt: firemix().timestampFromDate(new Date(user.updatedAt)),
  onboardedAt: user.onboardedAt ? firemix().timestampFromDate(new Date(user.onboardedAt)) : null,
});

export const userFromDatabase = (dbUser: DatabaseUser): User => ({
  ...dbUser,
  createdAt: dbUser.createdAt.toDate().toISOString(),
  updatedAt: dbUser.updatedAt.toDate().toISOString(),
  onboardedAt: dbUser.onboardedAt ? dbUser.onboardedAt.toDate().toISOString() : null,
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
