import { invokeHandler } from "@repo/functions";
import { Nullable, User } from "@repo/types";
import { invoke } from "@tauri-apps/api/core";
import { nowIso } from "../utils/date.utils";
import { invokeEnterprise } from "../utils/enterprise.utils";
import { LOCAL_USER_ID } from "../utils/user.utils";
import { BaseRepo } from "./base.repo";

type LocalUser = {
  id: string;
  name: string;
  bio: string;
  company?: string | null;
  title?: string | null;
  onboarded: boolean;
  preferredMicrophone: string | null;
  preferredLanguage: string | null;
  wordsThisMonth: number;
  wordsThisMonthMonth: string | null;
  wordsTotal: number;
  playInteractionChime?: boolean;
  hasFinishedTutorial?: boolean;
  cohort?: string | null;
  stylingMode?: string | null;
  selectedToneId?: string | null;
  activeToneIds?: string | null;
};

const fromLocalUser = (localUser: LocalUser): User => {
  const bio = localUser.bio;
  const isOnboarded = localUser.onboarded;
  const playInteractionChime =
    localUser.playInteractionChime == null
      ? true
      : localUser.playInteractionChime;

  return {
    id: localUser.id,
    createdAt: nowIso(),
    updatedAt: nowIso(),
    name: localUser.name,
    bio: bio.length > 0 ? bio : null,
    company: localUser.company ?? null,
    title: localUser.title ?? null,
    onboarded: isOnboarded,
    onboardedAt: isOnboarded ? nowIso() : null,
    timezone: null,
    preferredMicrophone: localUser.preferredMicrophone ?? null,
    preferredLanguage: localUser.preferredLanguage ?? null,
    wordsThisMonth: localUser.wordsThisMonth ?? 0,
    wordsThisMonthMonth: localUser.wordsThisMonthMonth ?? null,
    wordsTotal: localUser.wordsTotal ?? 0,
    playInteractionChime,
    hasFinishedTutorial: localUser.hasFinishedTutorial ?? false,
    cohort: localUser.cohort ?? null,
    stylingMode: (localUser.stylingMode as User["stylingMode"]) ?? null,
    selectedToneId: localUser.selectedToneId ?? null,
    activeToneIds: localUser.activeToneIds
      ? JSON.parse(localUser.activeToneIds)
      : null,
  };
};

const toLocalUser = (user: User): LocalUser => ({
  id: LOCAL_USER_ID,
  name: user.name,
  bio: user.bio ?? "",
  company: user.company ?? null,
  title: user.title ?? null,
  onboarded: user.onboarded,
  preferredMicrophone: user.preferredMicrophone ?? null,
  preferredLanguage: user.preferredLanguage ?? null,
  wordsThisMonth: user.wordsThisMonth,
  wordsThisMonthMonth: user.wordsThisMonthMonth ?? null,
  wordsTotal: user.wordsTotal,
  playInteractionChime: user.playInteractionChime,
  hasFinishedTutorial: user.hasFinishedTutorial,
  cohort: user.cohort ?? null,
  stylingMode: user.stylingMode ?? null,
  selectedToneId: user.selectedToneId ?? null,
  activeToneIds: user.activeToneIds ? JSON.stringify(user.activeToneIds) : null,
});

export abstract class BaseUserRepo extends BaseRepo {
  abstract setMyUser(user: User): Promise<User>;
  abstract getMyUser(): Promise<Nullable<User>>;
}

export class LocalUserRepo extends BaseUserRepo {
  async setMyUser(user: User): Promise<User> {
    const stored = await invoke<LocalUser>("user_set_one", {
      user: toLocalUser(user),
    });

    return fromLocalUser(stored);
  }

  async getMyUser(): Promise<Nullable<User>> {
    const user = await invoke<Nullable<LocalUser>>("user_get_one");

    return user ? fromLocalUser(user) : null;
  }
}

export class CloudUserRepo extends BaseUserRepo {
  async setMyUser(user: User): Promise<User> {
    await invokeHandler("user/setMyUser", { value: user });
    return user;
  }

  async getMyUser(): Promise<Nullable<User>> {
    const user = await invokeHandler("user/getMyUser", {}).then(
      (res) => res.user,
    );
    return user;
  }
}

export class EnterpriseUserRepo extends BaseUserRepo {
  async setMyUser(user: User): Promise<User> {
    await invokeEnterprise("user/setMyUser", { value: user });
    return user;
  }

  async getMyUser(): Promise<Nullable<User>> {
    const user = await invokeEnterprise("user/getMyUser", {}).then(
      (res) => res.user,
    );
    return user;
  }
}
