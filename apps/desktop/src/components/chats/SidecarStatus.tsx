import { Box, Tooltip } from "@mui/material";
import { useIntl } from "react-intl";
import { useAppStore } from "../../store";
import type { AiSidecarStatus } from "../../state/ai-sidecar.state";

const statusColor: Record<AiSidecarStatus, string> = {
  idle: "grey",
  starting: "orange",
  running: "limegreen",
  error: "red",
};

export const SidecarStatus = () => {
  const intl = useIntl();
  const { status, port, errorMessage } = useAppStore((s) => s.aiSidecar);

  const label = (() => {
    switch (status) {
      case "idle":
        return intl.formatMessage({ defaultMessage: "Sidecar idle" });
      case "starting":
        return intl.formatMessage({ defaultMessage: "Sidecar starting…" });
      case "running":
        return intl.formatMessage(
          { defaultMessage: "Sidecar running on port {port}" },
          { port: port ?? "?" },
        );
      case "error":
        return intl.formatMessage(
          { defaultMessage: "Sidecar error: {message}" },
          { message: errorMessage ?? "unknown" },
        );
    }
  })();

  return (
    <Tooltip title={label} placement="top">
      <Box
        sx={{
          width: 8,
          height: 8,
          borderRadius: "50%",
          backgroundColor: statusColor[status],
          flexShrink: 0,
        }}
      />
    </Tooltip>
  );
};
