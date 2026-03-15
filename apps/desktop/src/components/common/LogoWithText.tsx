import { ArrowOutwardRounded, SouthWestRounded } from "@mui/icons-material";
import { Chip, Stack, Tooltip, Typography, type StackProps } from "@mui/material";
import { useIntl } from "react-intl";
import { useAppStore } from "../../store";
import { getActiveRemoteTarget, getRemoteReceiverStatus } from "../../remote/device.store";
import { getMyUserPreferences } from "../../utils/user.utils";
import { Logo } from "./Logo";

export type LogoWithTextProps = StackProps;

export const LogoWithText = ({ sx, ...rest }: LogoWithTextProps) => {
  const intl = useIntl();
  const [activeRemoteTarget, remoteReceiverEnabled] = useAppStore((state) => [
    getActiveRemoteTarget(state),
    getRemoteReceiverStatus(state)?.enabled ?? false,
  ]);
  const remoteOutputEnabled = useAppStore(
    (state) => getMyUserPreferences(state)?.remoteOutputEnabled ?? false,
  );

  return (
    <Stack
      direction="row"
      sx={{
        display: "flex",
        alignItems: "center",
        userSelect: "none",
        ...sx,
      }}
      {...rest}
    >
      <Logo sx={{ mr: 1 }} />
      <Typography
        variant="h5"
        fontWeight="bold"
        sx={{
          userSelect: "none",
          display: { xs: "none", sm: "block" },
        }}
      >
        Voquill
      </Typography>
      <Stack direction="row" spacing={0.5} sx={{ ml: 1 }}>
        {remoteOutputEnabled && activeRemoteTarget && (
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
        {remoteReceiverEnabled && (
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
    </Stack>
  );
};
