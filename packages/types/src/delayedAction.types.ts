import { FiremixTimestamp } from "@firemix/core";
import type { Nullable } from "./common.types";

type BaseDelayedAction<T extends string> = {
  id: string;
  type: T;
  createdAt: FiremixTimestamp;
  createdByUserId?: Nullable<string>;
  runAfterTimestamp: FiremixTimestamp;
  status: "pending" | "completed" | "failed";
  processedAt?: Nullable<FiremixTimestamp>;
  errorMessage?: Nullable<string>;
};

export type DeleteAccountAction = BaseDelayedAction<"deleteAccount"> & {
  userId: string;
};

export type DelayedAction = DeleteAccountAction;
