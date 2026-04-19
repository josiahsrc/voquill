import {
  Box,
  Button,
  CircularProgress,
  Stack,
  Typography,
} from "@mui/material";
import { invoke } from "@tauri-apps/api/core";
import { invokeHandler } from "@voquill/functions";
import { useEffect, useState } from "react";
import { FormattedMessage } from "react-intl";
import { signOut } from "../../actions/login.actions";
import { getIsDevMode } from "../../utils/env.utils";

const ROUTING_TIMEOUT_MS = 15000;

const getRoutingUrlOverride = (): string | null => {
  if (!getIsDevMode()) {
    return null;
  }

  const override = import.meta.env.VITE_ENTERPRISE_ROUTING_URL_OVERRIDE;
  return typeof override === "string" && override.trim() ? override : null;
};

type RoutingState = { phase: "loading" } | { phase: "notFound" };

export default function EnterpriseRoutingPage() {
  const [state, setState] = useState<RoutingState>({ phase: "loading" });

  useEffect(() => {
    let cancelled = false;

    const timeoutId = window.setTimeout(() => {
      if (!cancelled) {
        setState({ phase: "notFound" });
      }
    }, ROUTING_TIMEOUT_MS);

    const load = async () => {
      try {
        const { customToken } = await invokeHandler("auth/mintCustomToken", {});
        if (cancelled) {
          return;
        }

        await invoke("auth_sign_in_with_custom_token", { customToken });
        if (cancelled) {
          return;
        }

        const override = getRoutingUrlOverride();
        const { url } = override
          ? { url: override }
          : await invokeHandler("enterprise/loadRoutingConfig", {});
        if (cancelled) {
          return;
        }

        window.clearTimeout(timeoutId);
        window.location.href = url;
      } catch (error) {
        console.error("Failed to load enterprise routing config", error);
        if (cancelled) {
          return;
        }

        window.clearTimeout(timeoutId);
        setState({ phase: "notFound" });
      }
    };

    void load();

    return () => {
      cancelled = true;
      window.clearTimeout(timeoutId);
    };
  }, []);

  const handleSignOut = async () => {
    await signOut();
  };

  return (
    <Box
      sx={{
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        px: 3,
      }}
    >
      <Stack spacing={3} alignItems="center" textAlign="center" maxWidth={420}>
        {state.phase === "loading" ? (
          <>
            <CircularProgress />
            <Typography variant="body1" color="text.secondary">
              <FormattedMessage defaultMessage="Taking you to the right place…" />
            </Typography>
          </>
        ) : (
          <>
            <Typography variant="h5" fontWeight={700}>
              <FormattedMessage defaultMessage="We couldn't find your workspace" />
            </Typography>
            <Typography variant="body1" color="text.secondary">
              <FormattedMessage defaultMessage="We couldn't locate an enterprise workspace for this account." />
            </Typography>
            <Button variant="contained" onClick={handleSignOut}>
              <FormattedMessage defaultMessage="Sign out" />
            </Button>
          </>
        )}
      </Stack>
    </Box>
  );
}
