import { useAppStore } from "../store";
import { getIsOnboarded, getMyUser } from "../utils/user.utils";

export const useMyUser = () => useAppStore(getMyUser);

export const useIsOnboarded = () => useAppStore(getIsOnboarded);
