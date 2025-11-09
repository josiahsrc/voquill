import z from "zod";
import type { Nullable } from "./common.types";

export type User = {
  id: string;
  createdAt: string;
  updatedAt: string;
  name: string;
  bio?: Nullable<string>;
  onboarded: boolean;
  onboardedAt: Nullable<string>;
  timezone?: Nullable<string>;
  preferredMicrophone?: Nullable<string>;
  playInteractionChime: boolean;
  wordsThisMonth: number;
  wordsThisMonthMonth: Nullable<string>;
  wordsTotal: number;
};

export const UserZod = z.object({
  id: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
  name: z.string(),
  bio: z.string().nullable().optional(),
  onboarded: z.boolean(),
  onboardedAt: z.string().nullable(),
  timezone: z.string().nullable().optional(),
  preferredMicrophone: z.string().nullable().optional(),
  playInteractionChime: z.boolean(),
  wordsThisMonth: z.number(),
  wordsThisMonthMonth: z.string().nullable(),
  wordsTotal: z.number(),
}).strict() satisfies z.ZodType<User>;
