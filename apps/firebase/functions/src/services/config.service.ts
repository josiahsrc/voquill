import { HandlerOutput } from "@repo/functions";
import { getFullConfig } from "../utils/config.utils";

export const getFullConfigResp = (): HandlerOutput<"config/getFullConfig"> => {
	const config = getFullConfig();
	return { config };
};
