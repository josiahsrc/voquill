import {
  CheckCircleOutline,
  HighlightOff,
  OpenInNew,
  PendingOutlined,
  RestartAlt,
} from "@mui/icons-material";
import {
  Alert,
  Button,
  Box,
  Chip,
  Dialog,
  DialogContent,
  DialogTitle,
  Stack,
  Typography,
} from "@mui/material";
import { relaunch } from "@tauri-apps/plugin-process";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { FormattedMessage, useIntl } from "react-intl";
import { produceAppState, useAppStore } from "../../store";
import type { PermissionKind } from "../../types/permission.types";
import {
  REQUIRED_PERMISSIONS,
  describePermissionState,
  getPermissionInstructions,
  getPermissionLabel,
  isPermissionAuthorized,
  requestAccessibilityPermission,
  requestMicrophonePermission,
} from "../../utils/permission.utils";
import { useLocation } from "react-router-dom";
import { setGotStartedAtNow } from "../../actions/user.actions";

const ICON_SIZE = 28;

const getPurposeDescription = (
  kind: PermissionKind,
  intl: ReturnType<typeof useIntl>,
): string => {
  const descriptions: Record<PermissionKind, string> = {
    microphone: intl.formatMessage({
      defaultMessage:
        "Allows Voquill to capture audio from your microphone for transcription.",
    }),
    accessibility: intl.formatMessage({
      defaultMessage:
        "Lets you trigger dictation hotkeys while using other applications.",
    }),
  };
  return descriptions[kind];
};

const PermissionRow = ({ kind }: { kind: PermissionKind }) => {
  const intl = useIntl();
  const status = useAppStore((state) => state.permissions[kind]);
  const [requesting, setRequesting] = useState(false);

  const { icon, color, chipColor, chipLabel } = useMemo(() => {
    if (!status) {
      return {
        icon: <PendingOutlined sx={{ fontSize: ICON_SIZE }} />,
        color: "text.secondary" as const,
        chipColor: "default" as const,
        chipLabel: intl.formatMessage({ defaultMessage: "Checking" }),
      };
    }

    if (isPermissionAuthorized(status.state)) {
      return {
        icon: (
          <CheckCircleOutline color="success" sx={{ fontSize: ICON_SIZE }} />
        ),
        color: "success.main" as const,
        chipColor: "success" as const,
        chipLabel: intl.formatMessage({ defaultMessage: "Authorized" }),
      };
    }

    return {
      icon: <HighlightOff color="error" sx={{ fontSize: ICON_SIZE }} />,
      color: "error.main" as const,
      chipColor: "error" as const,
      chipLabel: describePermissionState(status.state),
    };
  }, [status, intl]);

  const instructions = getPermissionInstructions(kind);
  const title = getPermissionLabel(kind);
  const requestingDisabled = status
    ? isPermissionAuthorized(status.state)
    : false;

  const handleRequest = useCallback(async () => {
    if (requesting || requestingDisabled) {
      return;
    }

    setRequesting(true);
    try {
      const requestFn =
        kind === "microphone"
          ? requestMicrophonePermission
          : requestAccessibilityPermission;
      const result = await requestFn();
      produceAppState((draft) => {
        draft.permissions[kind] = result;
      });
    } catch (error) {
      console.error(`Failed to request ${kind} permission`, error);
    } finally {
      setRequesting(false);
    }
  }, [kind, requesting, requestingDisabled]);

  return (
    <Stack
      direction="row"
      spacing={2}
      alignItems="flex-start"
      sx={{ paddingY: 1.5 }}
    >
      <Box sx={{ lineHeight: 0, color }}>{icon}</Box>
      <Stack spacing={0.5} sx={{ flex: 1 }}>
        <Stack direction="row" spacing={1} alignItems="center">
          <Typography variant="h6">{title}</Typography>
          <Chip size="small" color={chipColor} label={chipLabel} />
        </Stack>
        <Typography variant="body2" sx={{ fontWeight: 500 }}>
          {instructions}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {getPurposeDescription(kind, intl)}
        </Typography>
      </Stack>
      <Button
        variant="outlined"
        size="small"
        onClick={() => void handleRequest()}
        disabled={requesting || requestingDisabled}
        endIcon={<OpenInNew />}
      >
        <FormattedMessage defaultMessage="Enable" />
      </Button>
    </Stack>
  );
};

export const PermissionsDialog = () => {
  const permissions = useAppStore((state) => state.permissions);
  const [permissionWasGranted, setPermissionWasGranted] = useState(false);
  const previousPermissionsRef = useRef(permissions);
  const location = useLocation();
  const isWelcomePage = location.pathname === "/welcome";

  // Track when a permission transitions from not authorized to authorized
  useEffect(() => {
    const prev = previousPermissionsRef.current;
    for (const kind of REQUIRED_PERMISSIONS) {
      const prevStatus = prev[kind];
      const currentStatus = permissions[kind];
      if (
        prevStatus &&
        currentStatus &&
        !isPermissionAuthorized(prevStatus.state) &&
        isPermissionAuthorized(currentStatus.state)
      ) {
        setPermissionWasGranted(true);
        break;
      }
    }
    previousPermissionsRef.current = permissions;
  }, [permissions]);

  const { ready, blocked, allAuthorized } = useMemo(() => {
    let known = true;
    let missing = false;
    let allAuth = true;

    for (const kind of REQUIRED_PERMISSIONS) {
      const status = permissions[kind];
      if (!status) {
        known = false;
        allAuth = false;
        continue;
      }

      if (!isPermissionAuthorized(status.state)) {
        missing = true;
        allAuth = false;
      }
    }

    return { ready: known, blocked: missing, allAuthorized: allAuth };
  }, [permissions]);

  const open = ready && blocked && !isWelcomePage;
  const showRestartMessage = allAuthorized && permissionWasGranted;

  useEffect(() => {
    if (open) {
      setGotStartedAtNow();
    }
  }, [open]);

  const handleRestart = useCallback(async () => {
    try {
      await relaunch();
    } catch (error) {
      console.error("Failed to restart application", error);
    }
  }, []);

  const handleClose = (
    _event: unknown,
    reason: "backdropClick" | "escapeKeyDown",
  ) => {
    if (reason === "backdropClick" || reason === "escapeKeyDown") {
      return;
    }
  };

  return (
    <Dialog
      open={open || showRestartMessage}
      onClose={handleClose}
      fullWidth
      maxWidth="sm"
      disableEscapeKeyDown
      slotProps={{
        backdrop: {
          sx: { backdropFilter: "blur(4px)" },
        },
        paper: {
          sx: (theme) => ({
            paddingBottom: 2,
            backgroundColor: theme.vars?.palette.level1,
          }),
        },
      }}
    >
      <DialogTitle>
        <FormattedMessage defaultMessage="Permissions needed" />
      </DialogTitle>
      <DialogContent>
        <Stack spacing={3}>
          <Typography variant="body1">
            <FormattedMessage defaultMessage="Voquill is an AI dictation tool. It needs microphone and accessibility access in order to function properly." />
          </Typography>
          <Stack>
            {REQUIRED_PERMISSIONS.map((kind) => (
              <PermissionRow key={kind} kind={kind} />
            ))}
          </Stack>
          {showRestartMessage && (
            <Alert
              severity="info"
              action={
                <Button
                  color="inherit"
                  size="small"
                  onClick={() => void handleRestart()}
                  startIcon={<RestartAlt />}
                >
                  <FormattedMessage defaultMessage="Restart" />
                </Button>
              }
            >
              <FormattedMessage defaultMessage="Please restart the application for the new permissions to take effect." />
            </Alert>
          )}
        </Stack>
      </DialogContent>
    </Dialog>
  );
};
