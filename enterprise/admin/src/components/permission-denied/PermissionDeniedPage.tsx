import { Box, Typography, Button } from "@mui/material";
import { FormattedMessage } from "react-intl";
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
        <FormattedMessage defaultMessage="Permission Denied" />
      </Typography>
      <Typography color="text.secondary" textAlign="center" maxWidth={400}>
        <FormattedMessage defaultMessage="You don't have admin access to this server. Contact your administrator to request access." />
      </Typography>
      <Button variant="contained" onClick={signOut}>
        <FormattedMessage defaultMessage="Sign Out" />
      </Button>
    </Box>
  );
}
