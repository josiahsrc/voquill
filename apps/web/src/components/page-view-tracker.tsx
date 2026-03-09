"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { trackPageView } from "../utils/analytics.utils";

export function PageViewTracker() {
  const pathname = usePathname();

  useEffect(() => {
    if (pathname) {
      trackPageView(pathname);
    }
  }, [pathname]);

  return null;
}
