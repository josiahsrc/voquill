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
	mode: "signUp",
	hasSubmittedRegistration: false,
	errorMessage: "",
};

if (isEmulators()) {
	INITIAL_LOGIN_STATE.email = "emulator@voquill.com";
	INITIAL_LOGIN_STATE.password = "P@ssw0rd!";
	INITIAL_LOGIN_STATE.confirmPassword = "P@ssw0rd!";
}
