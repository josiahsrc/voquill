import { BaseUserRepo, LocalUserRepo } from "./user.repo";

export const getUserRepo = (): BaseUserRepo => {
  return new LocalUserRepo();
}