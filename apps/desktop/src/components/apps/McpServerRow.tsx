import DeleteOutlineRoundedIcon from "@mui/icons-material/DeleteOutlineRounded";
import RefreshRoundedIcon from "@mui/icons-material/RefreshRounded";
import {
  Box,
  Chip,
  IconButton,
  Stack,
  Switch,
  Typography,
} from "@mui/material";
import { getRec } from "@repo/utilities";
import { useCallback } from "react";
import { FormattedMessage, useIntl } from "react-intl";
import {
  deleteMcpServer,
  reconnectMcpServer,
  toggleMcpServer,
} from "../../actions/mcp-server.actions";
import { useAppStore } from "../../store";

export type McpServerRowProps = {
  id: string;
};

export const McpServerRow = ({ id }: McpServerRowProps) => {
  const intl = useIntl();
  const server = useAppStore((state) => getRec(state.mcpServerById, id));

  const handleToggle = useCallback(() => {
    if (!server) return;
    toggleMcpServer(id, !server.enabled);
  }, [id, server]);

  const handleDelete = useCallback(() => {
    deleteMcpServer(id);
  }, [id]);

  const handleReconnect = useCallback(() => {
    reconnectMcpServer(id);
  }, [id]);

  if (!server) {
    return null;
  }

  const isExpired = Boolean(
    server.tokenExpiresAt && new Date(server.tokenExpiresAt) < new Date(),
  );
  const needsReconnect = !server.isAuthenticated || isExpired;

  return (
    <Stack
      direction="row"
      spacing={2}
      alignItems="center"
      py={1.5}
      px={1}
      sx={{
        borderRadius: 1,
        "&:hover": {
          bgcolor: "action.hover",
        },
      }}
    >
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Typography variant="body1" fontWeight={500} noWrap>
          {server.name}
        </Typography>
        <Typography variant="caption" color="text.secondary" noWrap>
          {server.url}
        </Typography>
      </Box>

      {needsReconnect ? (
        <Chip
          label={<FormattedMessage defaultMessage="Reconnect needed" />}
          color="warning"
          size="small"
          variant="outlined"
        />
      ) : server.enabled ? (
        <Chip
          label={<FormattedMessage defaultMessage="Connected" />}
          color="success"
          size="small"
          variant="outlined"
        />
      ) : (
        <Chip
          label={<FormattedMessage defaultMessage="Disabled" />}
          color="default"
          size="small"
          variant="outlined"
        />
      )}

      {needsReconnect && (
        <IconButton
          aria-label={intl.formatMessage({
            defaultMessage: "Reconnect",
          })}
          onClick={handleReconnect}
          size="small"
        >
          <RefreshRoundedIcon fontSize="small" />
        </IconButton>
      )}

      <Switch
        checked={server.enabled}
        onChange={handleToggle}
        size="small"
        disabled={needsReconnect}
      />

      <IconButton
        aria-label={intl.formatMessage(
          { defaultMessage: "Delete {name}" },
          { name: server.name },
        )}
        onClick={handleDelete}
        size="small"
      >
        <DeleteOutlineRoundedIcon fontSize="small" />
      </IconButton>
    </Stack>
  );
};
