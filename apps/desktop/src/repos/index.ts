import { getAppState } from "../store";
import { getHasCloudAccess } from "../utils/user.utils";
import { BaseApiKeyRepo, LocalApiKeyRepo } from "./api-key.repo";
import { BaseAuthRepo, CloudAuthRepo } from "./auth.repo";
import { BaseHotkeyRepo, LocalHotkeyRepo } from "./hotkey.repo";
import { BaseTermRepo, CloudTermRepo, LocalTermRepo } from "./term.repo";
import { BaseTranscriptionRepo, LocalTranscriptionRepo } from "./transcription.repo";
import { BaseUserRepo, CloudUserRepo, LocalUserRepo } from "./user.repo";

const shouldUseCloud = () => getHasCloudAccess(getAppState());

export const getAuthRepo = (): BaseAuthRepo => {
  return new CloudAuthRepo();
};

export const getUserRepo = (): BaseUserRepo => {
  return shouldUseCloud() ? new CloudUserRepo() : new LocalUserRepo();
};

export const getTranscriptionRepo = (): BaseTranscriptionRepo => {
  return new LocalTranscriptionRepo();
};

export const getTermRepo = (): BaseTermRepo => {
  return shouldUseCloud() ? new CloudTermRepo() : new LocalTermRepo();
};

export const getHotkeyRepo = (): BaseHotkeyRepo => {
  return new LocalHotkeyRepo();
};

export const getApiKeyRepo = (): BaseApiKeyRepo => {
  return new LocalApiKeyRepo();
};
