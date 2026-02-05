import { FiremixTimestamp } from "@firemix/core";
import z from "zod";
import { Replace } from "./common.types";

export type DatabaseTone = {
  id: string;
  name: string;
  promptTemplate: string;
  isSystem: boolean;
  createdAt: FiremixTimestamp;
  sortOrder: number;
  isGlobal?: boolean;
  isDeprecated?: boolean;
  shouldDisablePostProcessing?: boolean;
};

export type Tone = Replace<DatabaseTone, FiremixTimestamp, number>;

export type ToneDoc = {
  id: string;
  toneIds: string[];
  toneById: Record<string, DatabaseTone>;
};

export const ToneZod = z
  .object({
    id: z.string(),
    name: z.string(),
    promptTemplate: z.string(),
    isSystem: z.boolean(),
    createdAt: z.number(),
    sortOrder: z.number(),
    isGlobal: z.boolean().optional(),
    isDeprecated: z.boolean().optional(),
    shouldDisablePostProcessing: z.boolean().optional(),
  })
  .strict() satisfies z.ZodType<Tone>;
