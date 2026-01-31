import { lazy, type ComponentType } from "react";

export function lazyLoad(
  factory: () => Promise<{ default: ComponentType<unknown> }>,
) {
  return lazy(factory);
}
