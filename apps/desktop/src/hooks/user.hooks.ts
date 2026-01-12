import { useAppStore } from "../store";
import {
  getIsOnboarded,
  getMyPreferredMicrophone,
  getMyUser,
} from "../utils/user.utils";

export const useMyUser = () => useAppStore(getMyUser);

export const useIsOnboarded = () => useAppStore(getIsOnboarded);

export const useMyPreferredMicrophone = () =>
  useAppStore(getMyPreferredMicrophone);
