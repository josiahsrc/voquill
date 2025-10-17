import { FiremixTimestamp } from "@firemix/core";

export type Term = {
  id: string;
  createdAt: FiremixTimestamp;
  createdByUserId: string;
  sourceValue: string;
  destinationValue: string;
  isDeleted: boolean;
};
