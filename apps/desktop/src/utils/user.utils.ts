import { Nullable, User } from "@repo/types";
import type { AppState } from "../state/app.state";
import { getRec } from "@repo/utilities";

export const getMyUserId = (state: AppState): string =>
  state.currentUserId ?? "local-user-id";

export const getMyUser = (state: AppState): Nullable<User> => {
  return getRec(state.userById, state.currentUserId) ?? null;
};

export const getMyUserName = (state: AppState): string => {
  const user = getMyUser(state);
  return user?.name || "Guest";
};
