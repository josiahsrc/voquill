import { FiremixTimestamp } from "@firemix/core";

export type Term = {
  id: string;
  createdAt: FiremixTimestamp;
  sourceValue: string;
  destinationValue: string;
  isReplacement: boolean;
};

export type TermDoc = {
  id: string;
  termIds: string[];
  termById: Record<string, Term>;
}
