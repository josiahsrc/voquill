import { Box, Button, Card, CardContent, CircularProgress, Typography } from "@mui/material";
import { useEffect, useState } from "react";
import { signOut } from "../../actions/login.actions";
import { invoke } from "../../utils/api.utils";
import { getAppVersion } from "../../utils/env.utils";
import { TabLayout } from "../common/TabLayout";

export default function SettingsTab() {
  const [serverVersion, setServerVersion] = useState<string | null>(null);

  useEffect(() => {
    invoke("system/getVersion", {}).then((data) => {
      setServerVersion(data.version);
    });
  }, []);

  return (
    <TabLayout title="Settings">
      <Box sx={{ display: "flex", flexDirection: "column", gap: 4 }}>
        <Card variant="outlined">
          <CardContent>
            <Typography variant="subtitle2" color="text.secondary" gutterBottom>
              Version
            </Typography>
            <Typography variant="body2">
              Admin: {getAppVersion()}
            </Typography>
            <Typography variant="body2">
              Server: {serverVersion ?? <CircularProgress size={12} />}
            </Typography>
          </CardContent>
        </Card>

        <Box>
          <Button variant="outlined" color="error" onClick={signOut}>
            Sign Out
          </Button>
        </Box>
      </Box>
    </TabLayout>
  );
}
