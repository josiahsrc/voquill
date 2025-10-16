import { Box, Container, Stack } from "@mui/material";
import { Outlet } from "react-router-dom";
import { DashboardMenu } from "./DashboardMenu";

export default function DashboardPage() {
  return (
    <Stack direction="row" sx={{ height: "100%", width: "100%" }}>
      <Box
        sx={{
          display: { xs: "none", sm: "flex" },
          flexDirection: "column",
          width: 280,
        }}
      >
        <DashboardMenu />
      </Box>
      <Stack
        sx={{
          flexGrow: 1,
          overflowY: "auto",
        }}
      >
        <Container maxWidth="sm" sx={{ pt: 4, pb: 16 }}>
          <Outlet />
        </Container>
      </Stack>
    </Stack>
  );
}
