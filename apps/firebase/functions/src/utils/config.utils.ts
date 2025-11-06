import { firemix } from "@firemix/mixed";
import { mixpath } from "@repo/firemix";
import { FullConfig } from "@repo/types";
import { getFullConfig } from "@repo/utilities";

export const loadFullConfig = async (): Promise<FullConfig> => {
  const partialConfig = await firemix().get(mixpath.systemConfig());
  return getFullConfig(partialConfig?.data);
};
