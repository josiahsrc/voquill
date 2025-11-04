import { ArrowUpwardOutlined } from "@mui/icons-material";
import { Button, Stack, Typography } from "@mui/material";
import { openUpgradePlanDialog } from "../../actions/pricing.actions";
import { useAppStore } from "../../store";
import { getIsPaying } from "../../utils/member.utils";

export const VoquillCloudSetting = () => {
  const isPro = useAppStore(getIsPaying);

  return (
    <Stack spacing={1}  alignItems="flex-start">
      <Typography variant="body1">Use Voquill Cloud</Typography>
      <Typography variant="body2" color="text.secondary">
        No downloads or manual setup. Record on any device and we&apos;ll keep
        your data secure, synced, and ready everywhere.
      </Typography>
      {!isPro && (
        <Button
          variant="contained"
          onClick={openUpgradePlanDialog}
          sx={{
            bgcolor: (theme) => theme.vars?.palette.blue,
            color: (theme) => theme.vars?.palette.onBlue,
            "&:hover": {
              bgcolor: (theme) => theme.vars?.palette.blueHover,
            },
            "&:active": {
              bgcolor: (theme) => theme.vars?.palette.blueActive,
            },
          }}
          endIcon={<ArrowUpwardOutlined />}
        >
          Upgrade
        </Button>
      )}
    </Stack>
  );
};
