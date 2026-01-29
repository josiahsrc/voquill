import type { AuthContext } from "@repo/types";
import { jwtDecode } from "jwt-decode";
import { INITIAL_LOGIN_STATE, type LoginMode } from "../state/login.state";
import { getAppState, produceAppState } from "../store";
import { invoke } from "../utils/api.utils";

export function setAuthTokens(token: string, refreshToken: string) {
  const payload = jwtDecode<AuthContext>(token);
  localStorage.setItem("token", token);
  localStorage.setItem("refreshToken", refreshToken);
  produceAppState((draft) => {
    draft.auth = payload;
    draft.token = token;
    draft.refreshToken = refreshToken;
  });
}

export function setLoginMode(mode: LoginMode) {
  produceAppState((draft) => {
    draft.login.mode = mode;
    draft.login.errorMessage = "";
    draft.login.status = "idle";
  });
}

export async function submitSignIn() {
  const { email, password } = getAppState().login;

  produceAppState((draft) => {
    draft.login.status = "loading";
    draft.login.errorMessage = "";
  });

  try {
    const data = await invoke("auth/login", { email, password });
    setAuthTokens(data.token, data.refreshToken);

    produceAppState((draft) => {
      draft.login.status = "success";
    });
  } catch (error) {
    produceAppState((draft) => {
      draft.login.status = "error";
      draft.login.errorMessage =
        error instanceof Error ? error.message : "Sign in failed";
    });
  }
}

export async function submitSignUp() {
  const { name, email, password, confirmPassword } = getAppState().login;

  if (password !== confirmPassword) {
    produceAppState((draft) => {
      draft.login.status = "error";
      draft.login.errorMessage = "Passwords do not match";
    });
    return;
  }

  produceAppState((draft) => {
    draft.login.status = "loading";
    draft.login.errorMessage = "";
  });

  try {
    const data = await invoke("auth/register", { email, password });
    setAuthTokens(data.token, data.refreshToken);

    try {
      await invoke("auth/makeAdmin", {
        userId: data.auth.id,
        isAdmin: true,
      });
      const refreshed = await invoke("auth/refresh", {
        refreshToken: data.refreshToken,
      });
      setAuthTokens(refreshed.token, refreshed.refreshToken);
    } catch (e) {
      console.error("[signup] failed to make admin:", e);
    }

    try {
      await invoke("user/setMyUser", {
        value: {
          id: data.auth.id,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          name,
          onboarded: false,
          onboardedAt: null,
          playInteractionChime: false,
          hasFinishedTutorial: false,
          wordsThisMonth: 0,
          wordsThisMonthMonth: null,
          wordsTotal: 0,
        },
      });
    } catch (e) {
      console.error("[signup] failed to create user profile:", e);
    }
    produceAppState((draft) => {
      draft.login.status = "success";
    });
  } catch (error) {
    produceAppState((draft) => {
      draft.login.status = "error";
      draft.login.errorMessage =
        error instanceof Error ? error.message : "Registration failed";
    });
  }
}

export function signOut() {
  localStorage.removeItem("token");
  localStorage.removeItem("refreshToken");
  produceAppState((draft) => {
    draft.auth = null;
    draft.token = null;
    draft.refreshToken = null;
    draft.login = INITIAL_LOGIN_STATE;
  });
}
