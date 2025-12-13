import type { AppState } from "../state/app.state";
import { getIntl } from "../i18n/intl";

export const validateEmail = (state: AppState): string | null => {
  const email = state.login.email;

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return getIntl().formatMessage({
      defaultMessage: "Invalid email address",
    });
  }

  return null;
};

export const validatePassword = (state: AppState): string | null => {
  const password = state.login.password;
  if (password.length < 6) {
    return getIntl().formatMessage({
      defaultMessage: "Password must be at least 6 characters long",
    });
  }

  return null;
};

export const validateConfirmPassword = (state: AppState): string | null => {
  const confirmPassword = state.login.confirmPassword;
  const password = state.login.password;

  if (confirmPassword !== password) {
    return getIntl().formatMessage({
      defaultMessage: "Password does not match",
    });
  }

  return null;
};

export const getSignUpEmailValidation = (state: AppState): string | null => {
  if (!state.login.hasSubmittedRegistration) {
    return null;
  }

  return validateEmail(state);
};

export const getSignUpPasswordValidation = (state: AppState): string | null => {
  if (!state.login.hasSubmittedRegistration) {
    return null;
  }

  return validatePassword(state);
};

export const getSignUpConfirmPasswordValidation = (
  state: AppState,
): string | null => {
  if (!state.login.hasSubmittedRegistration) {
    return null;
  }

  return validateConfirmPassword(state);
};

const getCanSubmitForm = (state: AppState): boolean => {
  if (state.login.status === "loading" || state.login.status === "success") {
    return false;
  }

  return true;
};

export const getCanSubmitLogin = (state: AppState): boolean => {
  if (!getCanSubmitForm(state)) {
    return false;
  }

  return state.login.email.trim() !== "" && state.login.password.trim() !== "";
};

export const getCanSubmitResetPassword = (state: AppState): boolean => {
  if (!getCanSubmitForm(state)) {
    return false;
  }

  return state.login.email.trim() !== "";
};

export const getCanSubmitSignUp = (state: AppState): boolean => {
  if (!getCanSubmitForm(state)) {
    return false;
  }

  const emailError = getSignUpEmailValidation(state);
  const passwordError = getSignUpPasswordValidation(state);
  const confirmPasswordError = getSignUpConfirmPasswordValidation(state);

  return !emailError && !passwordError && !confirmPasswordError;
};
