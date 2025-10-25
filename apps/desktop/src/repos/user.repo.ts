import { firemix } from "@firemix/client";
import { invoke } from "@tauri-apps/api/core";
import { Nullable, User } from "@repo/types";
import { BaseRepo } from "./base.repo";

type LocalUser = {
  id: string;
  name: string;
  bio: string;
  onboarded: boolean;
  preferredMicrophone: string | null;
  playInteractionChime?: boolean;
  preferredTranscriptionMode?: "local" | "api" | null;
  preferredTranscriptionApiKeyId?: string | null;
  preferredPostProcessingMode?: "none" | "api" | null;
  preferredPostProcessingApiKeyId?: string | null;
};

const toLocalUser = (user: User): LocalUser => ({
  id: user.id,
  name: user.name,
  bio: user.bio ?? "",
  onboarded: user.onboarded,
  preferredMicrophone: user.preferredMicrophone ?? null,
  playInteractionChime: user.playInteractionChime,
  preferredTranscriptionMode: user.preferredTranscriptionMode ?? null,
  preferredTranscriptionApiKeyId: user.preferredTranscriptionApiKeyId ?? null,
  preferredPostProcessingMode: user.preferredPostProcessingMode ?? null,
  preferredPostProcessingApiKeyId: user.preferredPostProcessingApiKeyId ?? null,
});

const fromLocalUser = (localUser: LocalUser): User => {
  const now = firemix().now();
  const bio = localUser.bio;
  const isOnboarded = localUser.onboarded;
  const playInteractionChime =
    localUser.playInteractionChime == null ? true : localUser.playInteractionChime;

  return {
    id: localUser.id,
    createdAt: now,
    updatedAt: now,
    name: localUser.name,
    bio: bio.length > 0 ? bio : null,
    onboarded: isOnboarded,
    onboardedAt: isOnboarded ? now : null,
    timezone: null,
    preferredMicrophone: localUser.preferredMicrophone ?? null,
    playInteractionChime,
    preferredTranscriptionMode: localUser.preferredTranscriptionMode ?? null,
    preferredTranscriptionApiKeyId: localUser.preferredTranscriptionApiKeyId ?? null,
    preferredPostProcessingMode: localUser.preferredPostProcessingMode ?? null,
    preferredPostProcessingApiKeyId: localUser.preferredPostProcessingApiKeyId ?? null,
  };
};

export abstract class BaseUserRepo extends BaseRepo {
  abstract setUser(user: User): Promise<User>;
  abstract getUser(id: string): Promise<Nullable<User>>;
}

export class LocalUserRepo extends BaseUserRepo {
  async setUser(user: User): Promise<User> {
    const stored = await invoke<LocalUser>("user_set_one", {
      user: toLocalUser(user),
    });

    return fromLocalUser(stored);
  }

  async getUser(): Promise<Nullable<User>> {
    const user = await invoke<Nullable<LocalUser>>("user_get_one");

    return user ? fromLocalUser(user) : null;
  }
}
