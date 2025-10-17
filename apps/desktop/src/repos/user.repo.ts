import { firemix } from "@firemix/client";
import { invoke } from "@tauri-apps/api/core";
import { Nullable, User } from "@repo/types";
import { BaseRepo } from "./base.repo";

type LocalUser = {
  id: string;
  name: string;
  bio: string;
  onboarded: boolean;
};

const toLocalUser = (user: User): LocalUser => ({
  id: user.id,
  name: user.name,
  bio: user.bio ?? "",
  onboarded: user.onboarded,
});

const fromLocalUser = (localUser: LocalUser): User => {
  const now = firemix().now();
  const bio = localUser.bio;
  const isOnboarded = localUser.onboarded;

  return {
    id: localUser.id,
    createdAt: now,
    updatedAt: now,
    name: localUser.name,
    bio: bio.length > 0 ? bio : null,
    onboarded: isOnboarded,
    onboardedAt: isOnboarded ? now : null,
    timezone: null,
  };
};

export abstract class BaseUserRepo extends BaseRepo {
  abstract setUser(user: User): Promise<User>;
  abstract getUser(): Promise<Nullable<User>>;
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
