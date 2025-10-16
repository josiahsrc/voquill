import { Box } from "@mui/material";
import { Suspense, useEffect } from "react";
import { Outlet } from "react-router-dom";
import { ErrorBoundary } from "react-error-boundary";
import { HeaderPortalProvider } from "./HeaderPortalContext";
import { LoadingApp } from "./LoadingApp";
import { usePageName } from "../../hooks/navigation.hooks";
import { useKeyDownHandler } from "../../hooks/helper.hooks";
import { getIsDevMode } from "../../utils/env.utils";

function ErrorFallback({ error }: { error: Error }) {
  return (
    <Box sx={{ padding: 2 }}>
      <h2>Something went wrong:</h2>
      <pre style={{ whiteSpace: "pre-wrap" }}>{error.message}</pre>
    </Box>
  );
}

export default function Root() {
  const pageTitle = usePageName();

  useEffect(() => {
    document.title = pageTitle ? `${pageTitle} - PineGo` : "PineGo";
  }, [pageTitle]);

  // You cannot refresh the page in Tauri, here's a hotkey to help with that
  useKeyDownHandler({
    keys: ["r"],
    ctrl: true,
    callback: () => {
      if (getIsDevMode()) {
        window.location.reload();
      }
    },
  });

  return (
    <HeaderPortalProvider>
      <ErrorBoundary FallbackComponent={ErrorFallback}>
        <Suspense fallback={<LoadingApp />}>
          <Box sx={{ width: "100%", height: "100%" }}>
            <Outlet />
          </Box>
        </Suspense>
      </ErrorBoundary>
    </HeaderPortalProvider>
  );
}
