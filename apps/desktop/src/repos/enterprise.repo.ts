import { EnterpriseConfig } from "@repo/types";
import { invokeEnterprise } from "../utils/enterprise.utils";
import { BaseRepo } from "./base.repo";

export class EnterpriseRepo extends BaseRepo {
  async getConfig(): Promise<EnterpriseConfig> {
    return invokeEnterprise("enterprise/getConfig", {}).then(
      (res) => res.config,
    );
  }
}
