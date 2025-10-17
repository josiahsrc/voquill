import { Box, Stack } from "@mui/material";
import { Outlet } from "react-router-dom";
import { DashboardMenu } from "./DashboardMenu";

export default function DashboardPage() {
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
    </Stack>
  );
}
