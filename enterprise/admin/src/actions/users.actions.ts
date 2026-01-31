import { produceAppState } from "../store";
import { registerUsers } from "../utils/app.utils";
import { invoke } from "../utils/api.utils";
import { showErrorSnackbar } from "./app.actions";

export async function loadUsers() {
  try {
    const data = await invoke("user/listAllUsers", {});
    produceAppState((draft) => {
      registerUsers(draft, data.users);
      draft.users.userIds = data.users.map((u) => u.id);
      draft.users.status = "success";
    });
  } catch (err) {
    showErrorSnackbar(err);
    produceAppState((draft) => {
      draft.users.status = "error";
    });
  }
}

export async function deleteUser(userId: string) {
  await invoke("auth/deleteUser", { userId });
  produceAppState((draft) => {
    draft.users.userIds = draft.users.userIds.filter((id) => id !== userId);
    delete draft.userWithAuthById[userId];
  });
}

export async function resetPassword(userId: string, password: string) {
  await invoke("auth/resetPassword", { userId, password });
}

export async function setUserAdmin(userId: string, isAdmin: boolean) {
  await invoke("auth/makeAdmin", { userId, isAdmin });
  produceAppState((draft) => {
    const user = draft.userWithAuthById[userId];
    if (user) {
      user.isAdmin = isAdmin;
    }
  });
}
