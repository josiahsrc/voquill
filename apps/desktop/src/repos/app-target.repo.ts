import { AppTarget } from "@repo/types";
import { invoke } from "@tauri-apps/api/core";
import { BaseRepo } from "./base.repo";

export type AppTargetUpsertParams = {
  id: string;
  name: string;
  toneId: string | null;
  iconPath: string | null;
};

export abstract class BaseAppTargetRepo extends BaseRepo {
  abstract listAppTargets(): Promise<AppTarget[]>;
  abstract upsertAppTarget(params: AppTargetUpsertParams): Promise<AppTarget>;
}

export class LocalAppTargetRepo extends BaseAppTargetRepo {
  async listAppTargets(): Promise<AppTarget[]> {
    return invoke<AppTarget[]>("app_target_list");
  }

  async upsertAppTarget(params: AppTargetUpsertParams): Promise<AppTarget> {
    return invoke<AppTarget>("app_target_upsert", {
      args: params,
    });
  }
}
