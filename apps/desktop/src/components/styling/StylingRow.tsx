import { AppTarget } from "@repo/types";
import { ListTile } from "../common/ListTile";

export type StylingRowProps = {
  target: AppTarget;
};

export const StylingRow = ({ target }: StylingRowProps) => (
  <ListTile title={target.name} disableRipple />
);
