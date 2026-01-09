import { Box } from "@mui/material";
import { Suspense, useEffect } from "react";
import { ErrorBoundary } from "react-error-boundary";
import { Outlet, useLocation } from "react-router-dom";
import { trackPageView } from "../../lib/analytics";
import { HeaderPortalProvider } from "./HeaderPortalContext";
import { LoadingApp } from "./LoadingApp";
import { PermissionSideEffects } from "./PermissionSideEffects";
import { RootConfetti } from "./RootConfetti";
import { RootDialogs } from "./RootDialogs";
import { RootSideEffects } from "./RootSideEffects";

function ErrorFallback({ error }: { error: Error }) {
  return (
    <Box sx={{ padding: 2 }}>
      <h2>Something went wrong:</h2>
      <pre style={{ whiteSpace: "pre-wrap" }}>{error.message}</pre>
    </Box>
  );
}

export default function Root() {
  const location = useLocation();

  useEffect(() => {
    trackPageView(location.pathname);
  }, [location.pathname]);

  return (
    <>
      <PermissionSideEffects />
      <RootConfetti />
      <RootSideEffects />
      <RootDialogs />
      <HeaderPortalProvider>
        <ErrorBoundary FallbackComponent={ErrorFallback}>
          <Suspense fallback={<LoadingApp />}>
            <Box sx={{ width: "100%", height: "100%" }}>
              <Outlet />
            </Box>
          </Suspense>
        </ErrorBoundary>
      </HeaderPortalProvider>
    </>
  );
}
