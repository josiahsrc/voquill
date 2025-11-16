import { AppTarget } from "@repo/types";
import { produceAppState } from "../store";
import { getAppTargetRepo } from "../repos";
import { registerAppTargets } from "../utils/app.utils";
import { AppTargetUpsertParams } from "../repos/app-target.repo";

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
