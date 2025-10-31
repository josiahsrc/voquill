import { Box, Stack, Typography } from "@mui/material";
import { getVersion } from "@tauri-apps/api/app";
import { Outlet } from "react-router-dom";
import { useAsyncData } from "../../hooks/async.hooks";
import { DashboardMenu } from "./DashboardMenu";

export default function DashboardPage() {
  const data = useAsyncData(getVersion, []);

  return (
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
          bottom: 2,
          left: 8,
          fontSize: "0.65rem",
          color: "text.secondary",
          opacity: 0.2,
        }}
      >
        {data.state === "success" ? `v${data.data}` : ""}
      </Typography>
    </Stack>
  );
}
