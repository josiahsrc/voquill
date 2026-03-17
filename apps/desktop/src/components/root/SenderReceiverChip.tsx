import { ArrowOutwardRounded, SouthWestRounded } from "@mui/icons-material";
import { Chip, Stack, Tooltip } from "@mui/material";
import { useIntl } from "react-intl";
import { useAppStore } from "../../store";
import {
  getActiveRemoteTarget,
  getRemoteReceiverStatus,
} from "../../utils/device.utils";
import { getMyUserPreferences } from "../../utils/user.utils";

export const SenderReceiverChip = () => {
  const intl = useIntl();
  const [activeRemoteTarget, remoteReceiverEnabled] = useAppStore((state) => [
    getActiveRemoteTarget(state),
    getRemoteReceiverStatus(state)?.enabled ?? false,
  ]);
  const remoteOutputEnabled = useAppStore(
    (state) => getMyUserPreferences(state)?.remoteOutputEnabled ?? false,
  );

  const showSender = remoteOutputEnabled && activeRemoteTarget;
  const showReceiver = remoteReceiverEnabled;

  if (!showSender && !showReceiver) return null;

  return (
    <Stack direction="row" spacing={0.5}>
      {showSender && (
        <Tooltip
          title={intl.formatMessage(
            { defaultMessage: "Sending to {name}" },
            { name: activeRemoteTarget.name },
          )}
        >
          <Chip
            size="small"
            variant="outlined"
            icon={<ArrowOutwardRounded />}
            label={intl.formatMessage({ defaultMessage: "Sender" })}
            sx={{ height: 22, display: { xs: "none", sm: "inline-flex" } }}
          />
        </Tooltip>
      )}
      {showReceiver && (
        <Tooltip
          title={intl.formatMessage({
            defaultMessage: "Receiver is listening for remote transcripts",
          })}
        >
          <Chip
            size="small"
            variant="outlined"
            icon={<SouthWestRounded />}
            label={intl.formatMessage({ defaultMessage: "Receiver" })}
            sx={{ height: 22, display: { xs: "none", sm: "inline-flex" } }}
          />
        </Tooltip>
      )}
    </Stack>
  );
};
