import { isDev } from "../utils/env.utils";

export type ActionStatus = "loading" | "success" | "error" | "idle";

export type LoginMode = "signIn" | "signUp";

export type LoginState = {
  email: string;
  password: string;
  confirmPassword: string;
  status: ActionStatus;
  mode: LoginMode;
  errorMessage: string;
};

export const INITIAL_LOGIN_STATE: LoginState = {
  email: "",
  password: "",
  confirmPassword: "",
  status: "idle",
  mode: "signUp",
  errorMessage: "",
};

if (isDev()) {
  INITIAL_LOGIN_STATE.email = "admin@voquill.com";
  INITIAL_LOGIN_STATE.password = "password123";
  INITIAL_LOGIN_STATE.confirmPassword = "password123";
}
