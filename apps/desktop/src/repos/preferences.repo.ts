import { Nullable, PostProcessingMode, TranscriptionMode, UserPreferences } from "@repo/types";
import { invoke } from "@tauri-apps/api/core";
import { BaseRepo } from "./base.repo";
import { LOCAL_USER_ID } from "../utils/user.utils";

type LocalUserPreferences = {
  userId: string;
  transcriptionMode: Nullable<TranscriptionMode>;
  transcriptionApiKeyId: Nullable<string>;
  postProcessingMode: Nullable<PostProcessingMode>;
  postProcessingApiKeyId: Nullable<string>;
  activeToneId: Nullable<string>;
};

const fromLocalPreferences = (preferences: LocalUserPreferences): UserPreferences => ({
  userId: preferences.userId,
  transcriptionMode: preferences.transcriptionMode,
  transcriptionApiKeyId: preferences.transcriptionApiKeyId,
  postProcessingMode: preferences.postProcessingMode,
  postProcessingApiKeyId: preferences.postProcessingApiKeyId,
  activeToneId: preferences.activeToneId,
});

const toLocalPreferences = (preferences: UserPreferences): LocalUserPreferences => ({
  userId: LOCAL_USER_ID,
  transcriptionMode: preferences.transcriptionMode ?? null,
  transcriptionApiKeyId: preferences.transcriptionApiKeyId ?? null,
  postProcessingMode: preferences.postProcessingMode ?? null,
  postProcessingApiKeyId: preferences.postProcessingApiKeyId ?? null,
  activeToneId: preferences.activeToneId ?? null,
});

export abstract class BaseUserPreferencesRepo extends BaseRepo {
  abstract setUserPreferences(preferences: UserPreferences): Promise<UserPreferences>;
  abstract getUserPreferences(userId: string): Promise<Nullable<UserPreferences>>;
}

export class LocalUserPreferencesRepo extends BaseUserPreferencesRepo {
  async setUserPreferences(preferences: UserPreferences): Promise<UserPreferences> {
    const saved = await invoke<LocalUserPreferences>("user_preferences_set", {
      preferences: toLocalPreferences(preferences),
    });

    return fromLocalPreferences(saved);
  }

  async getUserPreferences(userId: string): Promise<Nullable<UserPreferences>> {
    const result = await invoke<Nullable<LocalUserPreferences>>("user_preferences_get", {
      args: { userId },
    });

    return result ? fromLocalPreferences(result) : null;
  }
}
