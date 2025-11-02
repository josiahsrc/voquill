import type { ActionStatus } from "../types/state.types";
import { isEmulators } from "../utils/env.utils";

export type LoginMode =
	| "resetPassword"
	| "signIn"
	| "signUp"
	| "passwordResetSent";

export type LoginState = {
	email: string;
	password: string;
	confirmPassword: string;
	status: ActionStatus;
	mode: LoginMode;
	hasSubmittedRegistration: boolean;
	errorMessage: string;
};

export const INITIAL_LOGIN_STATE: LoginState = {
	email: "",
	password: "",
	confirmPassword: "",
	status: "idle",
	mode: "signIn",
	hasSubmittedRegistration: false,
	errorMessage: "",
};

if (isEmulators()) {
	INITIAL_LOGIN_STATE.email = "emulator@assetpack.ai";
	INITIAL_LOGIN_STATE.password = "ASSetP@k!";
	INITIAL_LOGIN_STATE.confirmPassword = "ASSetP@k!";
}
