import type { Nullable } from "./common.types";

export type AppTarget = {
  id: string;
  name: string;
  createdAt: string;
  toneId: Nullable<string>;
  iconPath: Nullable<string>;
};
