import { HandlerOutput } from "@repo/functions";
import { FULL_CONFIG } from "@repo/types";

export const getFullConfigResp = (): HandlerOutput<"config/getFullConfig"> => {
	return { config: FULL_CONFIG };
};
