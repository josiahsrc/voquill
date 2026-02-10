import { getAppState, produceAppState } from "../store";
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

export async function loadMyUser() {
  try {
    const data = await invoke("user/getMyUser", {});
    produceAppState((draft) => {
      draft.myUser = data.user;
      draft.myUserLoaded = true;
    });
  } catch (e) {
    console.error("[users] failed to load my user:", e);
  }
}

export async function updateMyUserName(name: string) {
  const myUser = getAppState().myUser;
  const authId = getAppState().auth?.userId;
  if (!authId) {
    showErrorSnackbar("No authenticated user");
    return;
  }

  await invoke("user/setMyUser", {
    value: {
      id: authId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      onboarded: false,
      onboardedAt: null,
      playInteractionChime: false,
      hasFinishedTutorial: false,
      wordsThisMonth: 0,
      wordsThisMonthMonth: null,
      wordsTotal: 0,
      ...myUser,
      name,
    },
  });

  await loadMyUser();
  await loadUsers();
}
