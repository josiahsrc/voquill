import { RocketLaunchOutlined } from "@mui/icons-material";
import { Button, Stack, Typography } from "@mui/material";
import { FormattedMessage } from "react-intl";
import { openUpgradePlanDialog } from "../../actions/pricing.actions";
import { useAppStore } from "../../store";
import { getIsPro } from "../../utils/member.utils";

export const VoquillCloudSetting = () => {
  const isPro = useAppStore(getIsPro);

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
    </Stack>
  );
};
