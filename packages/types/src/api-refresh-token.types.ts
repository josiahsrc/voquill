import { FiremixTimestamp } from "@firemix/core";
import { Replace } from "./common.types";

export type DatabaseApiRefreshToken = {
  uid: string;
  createdAt: FiremixTimestamp;
};

export type ApiRefreshToken = Replace<
  DatabaseApiRefreshToken,
  FiremixTimestamp,
  string
>;
