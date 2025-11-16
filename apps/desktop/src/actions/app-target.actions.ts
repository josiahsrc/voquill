import { AppTarget } from "@repo/types";
import { getAppState, produceAppState } from "../store";
import { getAppTargetRepo } from "../repos";
import { registerAppTargets } from "../utils/app.utils";
import { AppTargetUpsertParams } from "../repos/app-target.repo";
import { showErrorSnackbar } from "./app.actions";

export const loadAppTargets = async (): Promise<void> => {
  const targets = await getAppTargetRepo().listAppTargets();

  produceAppState((draft) => {
    registerAppTargets(draft, targets);
  });
};

export const upsertAppTarget = async (params: AppTargetUpsertParams): Promise<AppTarget> => {
  const target = await getAppTargetRepo().upsertAppTarget(params);

  produceAppState((draft) => {
    registerAppTargets(draft, [target]);
  });

  return target;
};

export const setAppTargetTone = async (
  id: string,
  toneId: string | null,
): Promise<void> => {
  const existing = getAppState().appTargetById[id];

  if (!existing) {
    showErrorSnackbar("App target is not registered.");
    return;
  }

  try {
    await upsertAppTarget({
      id,
      name: existing.name,
      toneId,
    });
  } catch (error) {
    console.error("Failed to update app target tone", error);
    showErrorSnackbar(
      error instanceof Error ? error.message : "Failed to update app target tone.",
    );
  }
};
