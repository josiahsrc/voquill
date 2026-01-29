import type { ActionStatus } from "./login.state";

export type UsersState = {
  userIds: string[];
  status: ActionStatus;
};

export const INITIAL_USERS_STATE: UsersState = {
  userIds: [],
  status: "idle",
};
