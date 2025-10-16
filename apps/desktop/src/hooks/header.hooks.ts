import type { ReactNode } from "react";
import { useContext, useEffect } from "react";
import { HeaderPortalContext } from "../contexts/header.context";

export const useHeaderPortal = () => {
  const context = useContext(HeaderPortalContext);
  if (!context) {
    throw new Error("useHeaderPortal must be used within HeaderPortalProvider");
  }
  return context;
};

export const useSetHeaderContent = (content: ReactNode) => {
  const { setLeftContent } = useHeaderPortal();

  useEffect(() => {
    setLeftContent(content);
    return () => setLeftContent(null);
  }, [content, setLeftContent]);
};
