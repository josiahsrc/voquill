import { FiremixTimestamp } from "@firemix/core";
import { Replace } from "./common.types";
import z from "zod";

export type DatabaseTerm = {
  id: string;
  createdAt: FiremixTimestamp;
  sourceValue: string;
  destinationValue: string;
  isReplacement: boolean;
};

export type Term = Replace<DatabaseTerm, FiremixTimestamp, string>;

export type TermDoc = {
  id: string;
  termIds: string[];
  termById: Record<string, DatabaseTerm>;
}

export const TermZod = z.object({
  id: z.string(),
  createdAt: z.string(),
  sourceValue: z.string(),
  destinationValue: z.string(),
  isReplacement: z.boolean(),
}).strict() satisfies z.ZodType<Term>;

