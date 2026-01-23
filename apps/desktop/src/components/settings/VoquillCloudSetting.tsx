import { RocketLaunchOutlined } from "@mui/icons-material";
import {
  Button,
  FormControlLabel,
  Stack,
  Switch,
  Typography,
} from "@mui/material";
import { useCallback } from "react";
import { FormattedMessage } from "react-intl";
import { openUpgradePlanDialog } from "../../actions/pricing.actions";
import { setCloudBackend } from "../../actions/user.actions";
import { useAppStore } from "../../store";
import { getIsPaying } from "../../utils/member.utils";

export const VoquillCloudSetting = () => {
  const isPro = useAppStore(getIsPaying);
  const cloudBackend = useAppStore(
    (state) => state.settings.aiTranscription.cloudBackend,
  );

  const handleToggleNewBackend = useCallback(
    (_event: React.ChangeEvent<HTMLInputElement>, checked: boolean) => {
      void setCloudBackend(checked ? "v2" : "v1");
    },
    [],
  );

  return (
    <Stack spacing={1} alignItems="flex-start">
      <Typography variant="body1">
        <FormattedMessage defaultMessage="Use Voquill Cloud" />
      </Typography>
      <Typography variant="body2" color="text.secondary">
        <FormattedMessage defaultMessage="No downloads or manual setup. Record on any device and we'll keep your data secure, synced, and ready everywhere." />
      </Typography>
      {!isPro && (
        <Button
          variant="blue"
          onClick={openUpgradePlanDialog}
          endIcon={<RocketLaunchOutlined />}
        >
          <FormattedMessage defaultMessage="Upgrade to Pro" />
        </Button>
      )}
      <FormControlLabel
        control={
          <Switch
            checked={cloudBackend === "v2"}
            onChange={handleToggleNewBackend}
          />
        }
        label={
          <Typography variant="body2">
            <FormattedMessage defaultMessage="Use new backend" />
          </Typography>
        }
      />
    </Stack>
  );
};
