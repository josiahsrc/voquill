import { StylingMode } from "@voquill/types";
import { AppState } from "../state/app.state";
import { getMyUser } from "./user.utils";

export const CURRENT_FEATURE_DATE = new Date("2026-01-01").toISOString();

export const getEffectiveStylingMode = (state: AppState): StylingMode => {
  const user = getMyUser(state);
  const enterprise = state.enterpriseConfig;
  if (enterprise && enterprise.stylingMode !== "any") {
    return enterprise.stylingMode;
  }

  return user?.stylingMode ?? "app";
};
