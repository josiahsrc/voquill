import { Box, Button } from "@mui/material";
import { signOut } from "../../actions/login.actions";

export default function SettingsTab() {
  return (
    <Box>
      <Button variant="outlined" color="error" onClick={signOut}>
        Sign Out
      </Button>
    </Box>
  );
}
