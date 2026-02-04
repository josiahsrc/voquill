import { StylingMode } from "@repo/types";
import { AppState } from "../state/app.state";
import { getMyUser } from "./user.utils";

export const CURRENT_FEATURE = "agent-mode";

export const getEffectiveStylingMode = (state: AppState): StylingMode => {
  const user = getMyUser(state);
  const enterprise = state.enterpriseConfig;
  if (enterprise && enterprise.stylingMode !== "any") {
    return enterprise.stylingMode;
  }

  return user?.stylingMode ?? "app";
};
