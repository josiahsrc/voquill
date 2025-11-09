import { firemix } from "@firemix/mixed";
import { DatabaseUser, User } from "@repo/types";

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
