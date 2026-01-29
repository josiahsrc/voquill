import { produceAppState } from "../store";
import { registerUsers } from "../utils/app.utils";
import { invoke } from "../utils/api.utils";
import { showErrorSnackbar } from "./app.actions";

export async function loadUsers() {
  produceAppState((draft) => {
    draft.users.status = "loading";
  });

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

export async function setUserAdmin(userId: string, isAdmin: boolean) {
  await invoke("auth/makeAdmin", { userId, isAdmin });
  produceAppState((draft) => {
    const user = draft.userWithAuthById[userId];
    if (user) {
      user.isAdmin = isAdmin;
    }
  });
}
