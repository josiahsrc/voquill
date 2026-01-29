import { jwtDecode } from "jwt-decode";
import type { AuthContext } from "@repo/types";
import { invoke } from "../utils/api.utils";
import { getAppState, produceAppState } from "../store";
import { INITIAL_LOGIN_STATE, type LoginMode } from "../state/login.state";

export function setAuthToken(token: string) {
  const payload = jwtDecode<AuthContext>(token);
  localStorage.setItem("token", token);
  produceAppState((draft) => {
    draft.auth = payload;
    draft.token = token;
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
    setAuthToken(data.token);

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
  const { email, password, confirmPassword } = getAppState().login;

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
    setAuthToken(data.token);

    try {
      await invoke("auth/makeAdmin", {
        userId: data.auth.id,
        isAdmin: true,
      });
      const refreshed = await invoke("auth/refresh", {});
      setAuthToken(refreshed.token);
    } catch (e) {
      console.log("Failed to make the first registered user an admin", e);
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
  produceAppState((draft) => {
    draft.auth = null;
    draft.token = null;
    draft.login = INITIAL_LOGIN_STATE;
  });
}
