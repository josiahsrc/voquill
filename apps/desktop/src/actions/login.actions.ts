import { listify } from "@repo/utilities";
import { invoke } from "@tauri-apps/api/core";
import { getAuthRepo, getMemberRepo } from "../repos";
import type { LoginMode } from "../state/login.state";
import { getAppState, produceAppState } from "../store";
import type { EnterpriseOidcPayload } from "../types/enterprise-oidc.types";
import { ENTERPRISE_OIDC_COMMAND } from "../types/enterprise-oidc.types";
import type { GoogleAuthPayload } from "../types/google-auth.types";
import { GOOGLE_AUTH_COMMAND } from "../types/google-auth.types";
import { registerMembers } from "../utils/app.utils";
import { getEnterpriseTarget } from "../utils/enterprise.utils";
import { validateEmail } from "../utils/login.utils";

const tryInit = async () => {
  const repo = getMemberRepo();
  await repo.tryInitialize();
  const member = await repo.getMyMember().catch(() => null);
  produceAppState((state) => {
    registerMembers(state, listify(member));
  });
};

export const submitSignIn = async (): Promise<void> => {
  const state = getAppState();
  try {
    produceAppState((state) => {
      state.login.status = "loading";
      state.login.errorMessage = "";
    });
    await getAuthRepo().signInWithEmail(
      state.login.email,
      state.login.password,
    );
    await tryInit();
    produceAppState((state) => {
      state.login.status = "success";
    });
  } catch {
    produceAppState((state) => {
      state.login.errorMessage = "An error occurred while signing in.";
      state.login.status = "idle";
    });
  }
};

export const submitSignInWithGoogle = async (): Promise<void> => {
  try {
    produceAppState((state) => {
      state.login.status = "loading";
      state.login.errorMessage = "";
    });
    await invoke(GOOGLE_AUTH_COMMAND);
  } catch {
    produceAppState((state) => {
      state.login.errorMessage = "An error occurred while signing in.";
      state.login.status = "idle";
    });
  }
};

export const handleGoogleAuthPayload = async (
  payload: GoogleAuthPayload,
): Promise<void> => {
  try {
    produceAppState((state) => {
      state.login.status = "loading";
      state.login.errorMessage = "";
    });
    await getAuthRepo().signInWithGoogleTokens(
      payload.idToken,
      payload.accessToken,
    );
    await tryInit();
    produceAppState((state) => {
      state.login.status = "success";
    });
  } catch (error) {
    console.error("Google auth error:", error);
    produceAppState((state) => {
      state.login.errorMessage =
        "An error occurred while signing in with Google.";
      state.login.status = "idle";
    });
  }
};

export const submitSignUp = async (): Promise<void> => {
  const state = getAppState();

  const emailValidation = validateEmail(state);
  const passwordValidation = validateEmail(state);
  const confirmPasswordValidation = validateEmail(state);
  const isInvalid =
    emailValidation || passwordValidation || confirmPasswordValidation;

  produceAppState((state) => {
    state.login.hasSubmittedRegistration = true;
  });

  if (isInvalid) {
    return;
  }

  try {
    produceAppState((state) => {
      state.login.status = "loading";
      state.login.errorMessage = "";
    });
    await getAuthRepo().signUpWithEmail(
      state.login.email,
      state.login.password,
    );
    await tryInit();
    await getAuthRepo().sendEmailVerificationForCurrentUser();
    produceAppState((state) => {
      state.login.status = "success";
    });
  } catch (e) {
    produceAppState((state) => {
      state.login.errorMessage =
        String(e) || "An error occurred while signing up.";
      state.login.status = "idle";
    });
  }
};

export const submitResetPassword = async (): Promise<void> => {
  const state = getAppState();
  try {
    produceAppState((state) => {
      state.login.status = "loading";
      state.login.errorMessage = "";
    });
    await getAuthRepo().sendPasswordResetRequest(state.login.email);
    produceAppState((state) => {
      state.login.status = "success";
    });
  } catch {
    // noop
  } finally {
    setMode("passwordResetSent");
  }
};

export const setMode = (mode: LoginMode): void => {
  produceAppState((state) => {
    state.login.mode = mode;
    state.login.status = "idle";
    state.login.hasSubmittedRegistration = false;
    state.login.errorMessage = "";
  });
};

export const submitSignInWithSso = async (
  providerId: string,
): Promise<void> => {
  try {
    produceAppState((state) => {
      state.login.status = "loading";
      state.login.errorMessage = "";
    });
    const target = getEnterpriseTarget();
    if (!target) {
      throw new Error("Enterprise gateway URL is not configured");
    }
    await invoke(ENTERPRISE_OIDC_COMMAND, {
      gatewayUrl: target.gatewayUrl,
      providerId,
    });
  } catch {
    produceAppState((state) => {
      state.login.errorMessage = "An error occurred while signing in with SSO.";
      state.login.status = "idle";
    });
  }
};

export const handleEnterpriseOidcPayload = async (
  payload: EnterpriseOidcPayload,
): Promise<void> => {
  try {
    produceAppState((state) => {
      state.login.status = "loading";
      state.login.errorMessage = "";
    });
    await getAuthRepo().signInWithSsoTokens({
      token: payload.token,
      refreshToken: payload.refreshToken,
      authId: payload.authId,
      email: payload.email,
    });
    await tryInit();
    produceAppState((state) => {
      state.login.status = "success";
    });
  } catch (error) {
    console.error("Enterprise OIDC auth error:", error);
    produceAppState((state) => {
      state.login.errorMessage = "An error occurred while signing in with SSO.";
      state.login.status = "idle";
    });
  }
};

export const signOut = async (): Promise<void> => {
  await getAuthRepo().signOut();
};
