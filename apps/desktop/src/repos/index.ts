import { BaseTranscriptionRepo, LocalTranscriptionRepo } from "./transcription.repo";
import { BaseUserRepo, LocalUserRepo } from "./user.repo";

export const getUserRepo = (): BaseUserRepo => {
  return new LocalUserRepo();
};

export const getTranscriptionRepo = (): BaseTranscriptionRepo => {
  return new LocalTranscriptionRepo();
};
