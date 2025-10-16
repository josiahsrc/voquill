import { useAppStore } from "../store";
import { getMyUser } from "../utils/user.utils";

export const useMyUser = () => useAppStore(getMyUser);

export const useIsOnboarded = () =>
  useAppStore((state) => Boolean(getMyUser(state)?.onboarded));
