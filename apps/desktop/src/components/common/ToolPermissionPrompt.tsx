import {
  CheckRounded,
  CloseRounded,
  DoneAllRounded,
} from "@mui/icons-material";
import { Box, Chip, Stack, Typography } from "@mui/material";
import { alpha, useTheme } from "@mui/material/styles";
import type { ToolPermission } from "@repo/types";
import { FormattedMessage } from "react-intl";
import { useAppStore } from "../../store";
import { ToolParamsTooltip } from "./ToolParamsTooltip";

type ToolPermissionPromptProps = {
  permission: ToolPermission;
  variant?: "default" | "overlay";
  onAllow: () => void;
  onDeny: () => void;
  onAlwaysAllow: () => void;
};

export const ToolPermissionPrompt = ({
  permission,
  variant = "default",
  onAllow,
  onDeny,
  onAlwaysAllow,
}: ToolPermissionPromptProps) => {
  const theme = useTheme();
  const toolInfo = useAppStore((s) => s.toolInfoById[permission.toolId]);
  const isPending = permission.status === "pending";
  const reason = permission.params.reason as string | undefined;

  if (variant === "overlay") {
    const whiteHigh = alpha(theme.palette.common.white, 0.92);
    const whiteMid = alpha(theme.palette.common.white, 0.5);

    return (
      <Box
        sx={{
          px: 1.5,
          py: 1,
          borderRadius: 1,
          border: `1px solid ${alpha(theme.palette.common.white, 0.2)}`,
          backgroundColor: alpha(theme.palette.common.white, 0.06),
        }}
      >
        <Stack direction="row" spacing={0.5} alignItems="center">
          <Typography sx={{ fontSize: 13, fontWeight: 600, color: whiteHigh }}>
            {toolInfo?.description ?? permission.toolId}
          </Typography>
          <ToolParamsTooltip
            params={permission.params}
            iconColor={whiteMid}
            iconSize={14}
          />
        </Stack>
        {reason && (
          <Typography sx={{ fontSize: 12, color: whiteMid, mt: 0.25 }}>
            {reason}
          </Typography>
        )}
        {isPending && (
          <Box
            sx={{
              display: "flex",
              gap: 1,
              justifyContent: "flex-end",
              mt: 0.75,
            }}
          >
            <OverlayButton color={whiteMid} bordered onMouseDown={onDeny}>
              <CloseRounded sx={{ fontSize: 14 }} />
              <FormattedMessage defaultMessage="Deny" />
            </OverlayButton>
            <OverlayButton filled onMouseDown={onAllow}>
              <CheckRounded sx={{ fontSize: 14 }} />
              <FormattedMessage defaultMessage="Allow" />
            </OverlayButton>
            <OverlayButton color={whiteMid} onMouseDown={onAlwaysAllow}>
              <DoneAllRounded sx={{ fontSize: 14 }} />
              <FormattedMessage defaultMessage="Always allow" />
            </OverlayButton>
          </Box>
        )}
      </Box>
    );
  }

  return (
    <Stack direction="row" justifyContent="flex-start">
      <Box
        sx={{
          maxWidth: "75%",
          px: 2,
          py: 1.5,
          borderRadius: 1,
          border: 1,
          borderColor: "primary.main",
          bgcolor: "background.paper",
        }}
      >
        <Stack spacing={1}>
          <Stack spacing={0.25}>
            <Stack direction="row" spacing={0.5} alignItems="center">
              <Typography variant="body2" fontWeight={600}>
                {toolInfo?.description ?? permission.toolId}
              </Typography>
              <ToolParamsTooltip params={permission.params} />
              {!isPending && (
                <Chip
                  size="small"
                  label={permission.status}
                  color={permission.status === "allowed" ? "success" : "error"}
                  sx={{ ml: "auto" }}
                />
              )}
            </Stack>
            {reason && (
              <Typography variant="caption" color="text.secondary">
                {reason}
              </Typography>
            )}
          </Stack>

          {isPending && (
            <Stack direction="row" spacing={1} justifyContent="flex-start">
              <Chip
                size="small"
                variant="outlined"
                label={<FormattedMessage defaultMessage="Deny" />}
                icon={<CloseRounded />}
                onClick={onDeny}
              />
              <Chip
                size="small"
                color="primary"
                label={<FormattedMessage defaultMessage="Allow" />}
                icon={<CheckRounded />}
                onClick={onAllow}
              />
              <Chip
                size="small"
                variant="outlined"
                label={<FormattedMessage defaultMessage="Always allow" />}
                icon={<DoneAllRounded />}
                sx={{ border: "none" }}
                onClick={onAlwaysAllow}
              />
            </Stack>
          )}
        </Stack>
      </Box>
    </Stack>
  );
};

const OverlayButton = ({
  children,
  color,
  filled,
  bordered,
  onMouseDown,
}: {
  children: React.ReactNode;
  color?: string;
  filled?: boolean;
  bordered?: boolean;
  onMouseDown: () => void;
}) => {
  const theme = useTheme();
  const whiteMid = alpha(theme.palette.common.white, 0.5);

  return (
    <Box
      component="button"
      onMouseDown={(e: React.MouseEvent) => {
        e.stopPropagation();
        onMouseDown();
      }}
      sx={{
        display: "inline-flex",
        alignItems: "center",
        gap: 0.5,
        px: 1,
        py: 0.25,
        fontSize: 12,
        fontWeight: 500,
        color: filled ? theme.palette.common.black : (color ?? whiteMid),
        backgroundColor: filled ? theme.palette.common.white : "transparent",
        border: bordered
          ? `1px solid ${alpha(theme.palette.common.white, 0.2)}`
          : filled
            ? `1px solid ${theme.palette.common.white}`
            : "none",
        borderRadius: 1,
        cursor: "pointer",
        "&:hover": {
          backgroundColor: filled
            ? alpha(theme.palette.common.white, 0.85)
            : alpha(theme.palette.common.white, 0.08),
        },
      }}
    >
      {children}
    </Box>
  );
};
