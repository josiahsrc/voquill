import { CheckRounded, CloseRounded } from "@mui/icons-material";
import { Box, Button, Chip, Stack, Typography } from "@mui/material";
import type { ToolPermission } from "@repo/types";
import { FormattedMessage } from "react-intl";
import { resolveToolPermission } from "../../actions/tool.actions";
import { useAppStore } from "../../store";

type ToolPermissionCardProps = {
  permission: ToolPermission;
};

export const ToolPermissionCard = ({ permission }: ToolPermissionCardProps) => {
  const toolInfo = useAppStore((s) => s.toolInfoById[permission.toolId]);
  const isPending = permission.status === "pending";

  return (
    <Stack direction="row" justifyContent="flex-start">
      <Box
        sx={{
          maxWidth: "75%",
          px: 2,
          py: 1.5,
          borderRadius: 1,
          border: 1,
          borderColor: isPending ? "warning.main" : "divider",
          bgcolor: "background.paper",
        }}
      >
        <Stack spacing={1}>
          <Stack direction="row" spacing={1} alignItems="center">
            <Typography variant="body2" fontWeight={600}>
              {toolInfo?.description ?? permission.toolId}
            </Typography>
            {!isPending && (
              <Chip
                size="small"
                label={permission.status}
                color={permission.status === "allowed" ? "success" : "error"}
              />
            )}
          </Stack>

          <Box
            component="pre"
            sx={{
              m: 0,
              p: 1,
              borderRadius: 0.5,
              bgcolor: "action.selected",
              overflow: "auto",
              fontSize: "0.8rem",
            }}
          >
            {JSON.stringify(permission.params, null, 2)}
          </Box>

          {isPending && (
            <Stack direction="row" spacing={1}>
              <Button
                size="small"
                variant="contained"
                color="success"
                startIcon={<CheckRounded />}
                onClick={() => resolveToolPermission(permission.id, "allowed")}
              >
                <FormattedMessage defaultMessage="Allow" />
              </Button>
              <Button
                size="small"
                variant="outlined"
                color="error"
                startIcon={<CloseRounded />}
                onClick={() => resolveToolPermission(permission.id, "denied")}
              >
                <FormattedMessage defaultMessage="Deny" />
              </Button>
            </Stack>
          )}
        </Stack>
      </Box>
    </Stack>
  );
};
