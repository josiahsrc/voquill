import { BaseTermRepo, LocalTermRepo } from "./term.repo";
import { BaseTranscriptionRepo, LocalTranscriptionRepo } from "./transcription.repo";
import { BaseUserRepo, LocalUserRepo } from "./user.repo";
import { BaseHotkeyRepo, LocalHotkeyRepo } from "./hotkey.repo";

export const getUserRepo = (): BaseUserRepo => {
  return new LocalUserRepo();
};

export const getTranscriptionRepo = (): BaseTranscriptionRepo => {
  return new LocalTranscriptionRepo();
};

export const getTermRepo = (): BaseTermRepo => {
  return new LocalTermRepo();
};

export const getHotkeyRepo = (): BaseHotkeyRepo => {
  return new LocalHotkeyRepo();
};
