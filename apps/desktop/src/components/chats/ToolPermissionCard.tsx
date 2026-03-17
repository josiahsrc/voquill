import {
  CheckRounded,
  CloseRounded,
  DoneAllRounded,
  InfoOutlined,
} from "@mui/icons-material";
import { Box, Chip, Stack, Tooltip, Typography } from "@mui/material";
import type { ToolPermission } from "@repo/types";
import { FormattedMessage } from "react-intl";
import {
  resolveToolPermission,
  setToolAlwaysAllow,
} from "../../actions/tool.actions";
import { useAppStore } from "../../store";

type ToolPermissionCardProps = {
  permission: ToolPermission;
};

export const ToolPermissionCard = ({ permission }: ToolPermissionCardProps) => {
  const toolInfo = useAppStore((s) => s.toolInfoById[permission.toolId]);
  const isPending = permission.status === "pending";
  const reason = permission.params.reason as string | undefined;

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
              <Tooltip
                title={
                  <Box
                    component="pre"
                    sx={{ m: 0, fontSize: "0.75rem", whiteSpace: "pre-wrap" }}
                  >
                    {JSON.stringify(permission.params, null, 2)}
                  </Box>
                }
                arrow
                placement="top"
              >
                <InfoOutlined
                  sx={{ fontSize: 16, color: "text.secondary", cursor: "help" }}
                />
              </Tooltip>
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
                onClick={() => resolveToolPermission(permission.id, "denied")}
              />
              <Chip
                size="small"
                color="primary"
                label={<FormattedMessage defaultMessage="Allow" />}
                icon={<CheckRounded />}
                onClick={() => resolveToolPermission(permission.id, "allowed")}
              />
              <Chip
                size="small"
                variant="outlined"
                label={<FormattedMessage defaultMessage="Always allow" />}
                icon={<DoneAllRounded />}
                sx={{ border: "none" }}
                onClick={() => {
                  setToolAlwaysAllow({
                    toolId: permission.toolId,
                    params: permission.params,
                    allowed: true,
                  });
                  resolveToolPermission(permission.id, "allowed");
                }}
              />
            </Stack>
          )}
        </Stack>
      </Box>
    </Stack>
  );
};
