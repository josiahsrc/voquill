import { blaze, FullConfig, getFullConfig, path } from "../shared";

export const loadFullConfig = async (): Promise<FullConfig> => {
	const partialConfig = await firemix().get(path.systemConfig());
	return getFullConfig(partialConfig?.data);
};
