import { createContext, type ReactNode } from "react";

export type HeaderPortalContextType = {
  leftContent: ReactNode;
  setLeftContent: (content: ReactNode) => void;
};

export const HeaderPortalContext =
  createContext<HeaderPortalContextType | null>(null);
