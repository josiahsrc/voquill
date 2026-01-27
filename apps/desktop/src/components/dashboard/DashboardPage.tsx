import { Box, Stack, Typography } from "@mui/material";
import { getVersion } from "@tauri-apps/api/app";
import { Outlet } from "react-router-dom";
import { useAsyncData } from "../../hooks/async.hooks";
import { DashboardMenu } from "./DashboardMenu";
import { FeatureReleaseDialog } from "./FeatureReleaseDialog";
import { PermissionsDialog } from "./PermissionsDialog";
import { TrialEndedDialog } from "./TrialEndedDialog";

export default function DashboardPage() {
  const data = useAsyncData(getVersion, []);

  return (
    <>
      <FeatureReleaseDialog />
      <PermissionsDialog />
      <TrialEndedDialog />
      <Stack direction="row" sx={{ height: "100%", width: "100%" }}>
        <Box
          sx={{
            display: { xs: "none", sm: "flex" },
            flexDirection: "column",
            width: 224,
          }}
        >
          <DashboardMenu />
        </Box>
        <Outlet />
        <Typography
          variant="caption"
          sx={{
            position: "fixed",
            bottom: 0,
            left: 8,
            fontSize: "0.55rem",
            color: "text.secondary",
            opacity: 0.3,
          }}
        >
          {data.state === "success" ? `v${data.data}` : ""}
        </Typography>
      </Stack>
    </>
  );
}
