import {
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  FormControlLabel,
  Switch,
  Typography,
} from "@mui/material";
import type { EnterpriseConfig } from "@repo/types";
import { useEffect } from "react";
import { signOut } from "../../actions/login.actions";
import {
  loadSettings,
  updateEnterpriseConfig,
} from "../../actions/settings.actions";
import { useAppStore } from "../../store";
import { getAppVersion } from "../../utils/env.utils";
import { TabLayout } from "../common/TabLayout";

export default function SettingsTab() {
  const serverVersion = useAppStore((s) => s.settings.serverVersion);
  const enterpriseConfig = useAppStore((s) => s.settings.enterpriseConfig);

  useEffect(() => {
    loadSettings();
  }, []);

  function handleToggle(key: keyof EnterpriseConfig, value: boolean) {
    if (!enterpriseConfig) return;
    updateEnterpriseConfig({ ...enterpriseConfig, [key]: value });
  }

  return (
    <TabLayout title="Settings">
      <Box sx={{ display: "flex", flexDirection: "column", gap: 4 }}>
        <Card variant="outlined">
          <CardContent>
            <Typography variant="subtitle2" color="text.secondary" gutterBottom>
              Company Settings
            </Typography>
            {enterpriseConfig === null ? (
              <CircularProgress size={20} />
            ) : (
              <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={enterpriseConfig.allowChangePostProcessing}
                      onChange={(_, checked) =>
                        handleToggle("allowChangePostProcessing", checked)
                      }
                    />
                  }
                  label="Allow users to change post-processing method"
                />
                <FormControlLabel
                  control={
                    <Switch
                      checked={enterpriseConfig.allowChangeTranscriptionMethod}
                      onChange={(_, checked) =>
                        handleToggle("allowChangeTranscriptionMethod", checked)
                      }
                    />
                  }
                  label="Allow users to change transcription method"
                />
              </Box>
            )}
          </CardContent>
        </Card>

        <Card variant="outlined">
          <CardContent>
            <Typography variant="subtitle2" color="text.secondary" gutterBottom>
              Version
            </Typography>
            <Typography variant="body2">Admin: {getAppVersion()}</Typography>
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
