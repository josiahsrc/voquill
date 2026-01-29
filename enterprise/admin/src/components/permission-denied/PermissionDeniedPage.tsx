import { Box, Typography, Button } from "@mui/material";
import { signOut } from "../../actions/login.actions";

export default function PermissionDeniedPage() {
  return (
    <Box
      sx={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 3,
      }}
    >
      <Typography variant="h5" fontWeight={600}>
        Permission Denied
      </Typography>
      <Typography color="text.secondary" textAlign="center" maxWidth={400}>
        You don't have admin access to this server. Contact your administrator
        to request access.
      </Typography>
      <Button variant="contained" onClick={signOut}>
        Sign Out
      </Button>
    </Box>
  );
}
