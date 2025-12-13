import type { ReactNode } from "react";
import { useState } from "react";
import { HeaderPortalContext } from "../../contexts/header.context";

export const HeaderPortalProvider = ({ children }: { children: ReactNode }) => {
  const [leftContent, setLeftContent] = useState<ReactNode>(null);

  return (
    <HeaderPortalContext.Provider value={{ leftContent, setLeftContent }}>
      {children}
    </HeaderPortalContext.Provider>
  );
};
