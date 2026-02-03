import { FiremixTimestamp } from "@firemix/core";
import z from "zod";
import { StylingModeZod } from "./common.types";
import type { Nullable, Replace, StylingMode } from "./common.types";

export type DatabaseUser = {
  id: string;
  createdAt: FiremixTimestamp;
  updatedAt: FiremixTimestamp;
  name: string;
  bio?: Nullable<string>;
  company?: Nullable<string>;
  title?: Nullable<string>;
  onboarded: boolean;
  onboardedAt: Nullable<FiremixTimestamp>;
  timezone?: Nullable<string>;
  preferredLanguage?: Nullable<string>;
  preferredMicrophone?: Nullable<string>;
  playInteractionChime: boolean;
  hasFinishedTutorial: boolean;
  wordsThisMonth: number;
  wordsThisMonthMonth: Nullable<string>;
  wordsTotal: number;
  hasMigratedPreferredMicrophone?: boolean;
  cohort?: Nullable<string>;
  shouldShowUpgradeDialog?: boolean;
  stylingMode?: Nullable<StylingMode>;
  selectedToneId?: Nullable<string>;
  activeToneIds?: Nullable<string[]>;
};

export type User = Replace<DatabaseUser, FiremixTimestamp, string>;

export type UserWithAuth = User & {
  email: string;
  isAdmin: boolean;
};

export const UserZod = z
  .object({
    id: z.string(),
    createdAt: z.string(),
    updatedAt: z.string(),
    name: z.string(),
    bio: z.string().nullable().optional(),
    company: z.string().nullable().optional(),
    title: z.string().nullable().optional(),
    onboarded: z.boolean(),
    onboardedAt: z.string().nullable(),
    timezone: z.string().nullable().optional(),
    preferredLanguage: z.string().nullable().optional(),
    preferredMicrophone: z.string().nullable().optional(),
    playInteractionChime: z.boolean(),
    hasFinishedTutorial: z.boolean(),
    wordsThisMonth: z.number(),
    wordsThisMonthMonth: z.string().nullable(),
    wordsTotal: z.number(),
    hasMigratedPreferredMicrophone: z.boolean().optional(),
    cohort: z.string().nullable().optional(),
    shouldShowUpgradeDialog: z.boolean().optional(),
    stylingMode: StylingModeZod.nullable().optional(),
    selectedToneId: z.string().nullable().optional(),
    activeToneIds: z.array(z.string()).nullable().optional(),
  })
  .strict() satisfies z.ZodType<User>;
