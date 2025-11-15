import {
  CheckCircleOutline,
  HighlightOff,
  OpenInNew,
  PendingOutlined,
} from "@mui/icons-material";
import {
  Button,
  Box,
  Chip,
  Dialog,
  DialogContent,
  DialogTitle,
  Stack,
  Typography,
} from "@mui/material";
import { useCallback, useMemo, useState } from "react";
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

const ICON_SIZE = 28;

const getPurposeDescription = (
  kind: PermissionKind,
  intl: ReturnType<typeof useIntl>
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

  const { ready, blocked } = useMemo(() => {
    let known = true;
    let missing = false;

    for (const kind of REQUIRED_PERMISSIONS) {
      const status = permissions[kind];
      if (!status) {
        known = false;
        continue;
      }

      if (!isPermissionAuthorized(status.state)) {
        missing = true;
      }
    }

    return { ready: known, blocked: missing };
  }, [permissions]);

  const open = ready && blocked;

  const handleClose = (
    _event: unknown,
    reason: "backdropClick" | "escapeKeyDown"
  ) => {
    if (reason === "backdropClick" || reason === "escapeKeyDown") {
      return;
    }
  };

  return (
    <Dialog
      open={open}
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
        <FormattedMessage defaultMessage="Voquill needs permissions to run" />
      </DialogTitle>
      <DialogContent>
        <Stack spacing={3}>
          <Typography variant="body1">
            <FormattedMessage defaultMessage="This dialog will close automatically after you have granted all required permissions." />
          </Typography>
          <Stack>
            {REQUIRED_PERMISSIONS.map((kind) => (
              <PermissionRow key={kind} kind={kind} />
            ))}
          </Stack>
        </Stack>
      </DialogContent>
    </Dialog>
  );
};
