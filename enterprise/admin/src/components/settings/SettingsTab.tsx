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
import { FormattedMessage, useIntl } from "react-intl";
import { signOut } from "../../actions/login.actions";
import { updateEnterpriseConfig } from "../../actions/settings.actions";
import { useAppStore } from "../../store";
import { getAppVersion } from "../../utils/env.utils";
import { TabLayout } from "../common/TabLayout";

export default function SettingsTab() {
  const intl = useIntl();
  const serverVersion = useAppStore((s) => s.settings.serverVersion);
  const enterpriseConfig = useAppStore((s) => s.enterpriseConfig);
  const license = useAppStore((s) => s.enterpriseLicense);

  function handleToggle(key: keyof EnterpriseConfig, value: boolean) {
    if (!enterpriseConfig) return;
    updateEnterpriseConfig({ ...enterpriseConfig, [key]: value });
  }

  return (
    <TabLayout
      title={intl.formatMessage({ defaultMessage: "Settings" })}
    >
      <Box sx={{ display: "flex", flexDirection: "column", gap: 4 }}>
        <Card variant="outlined">
          <CardContent>
            <Typography variant="subtitle2" color="text.secondary" gutterBottom>
              <FormattedMessage defaultMessage="License" />
            </Typography>
            {license === null ? (
              <CircularProgress size={20} />
            ) : (
              <Box sx={{ display: "flex", flexDirection: "column", gap: 0.5 }}>
                <Typography variant="body2">
                  <FormattedMessage
                    defaultMessage="Organization: {org}"
                    values={{ org: license.org }}
                  />
                </Typography>
                <Typography variant="body2">
                  <FormattedMessage
                    defaultMessage="Max Seats: {maxSeats}"
                    values={{ maxSeats: license.maxSeats }}
                  />
                </Typography>
                <Typography variant="body2">
                  <FormattedMessage
                    defaultMessage="Issued: {issued}"
                    values={{ issued: license.issued }}
                  />
                </Typography>
                <Typography variant="body2">
                  <FormattedMessage
                    defaultMessage="Expires: {expires}"
                    values={{ expires: license.expires }}
                  />
                </Typography>
              </Box>
            )}
          </CardContent>
        </Card>

        <Card variant="outlined">
          <CardContent>
            <Typography variant="subtitle2" color="text.secondary" gutterBottom>
              <FormattedMessage defaultMessage="Client App" />
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
                  label={
                    <FormattedMessage defaultMessage="Allow users to change post-processing method" />
                  }
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
                  label={
                    <FormattedMessage defaultMessage="Allow users to change transcription method" />
                  }
                />
                <FormControlLabel
                  control={
                    <Switch
                      checked={enterpriseConfig.allowChangeAgentMode}
                      onChange={(_, checked) =>
                        handleToggle("allowChangeAgentMode", checked)
                      }
                    />
                  }
                  label={
                    <FormattedMessage defaultMessage="Allow users to change agent mode" />
                  }
                />
              </Box>
            )}
          </CardContent>
        </Card>

        <Card variant="outlined">
          <CardContent>
            <Typography variant="subtitle2" color="text.secondary" gutterBottom>
              <FormattedMessage defaultMessage="Version" />
            </Typography>
            <Typography variant="body2">
              <FormattedMessage
                defaultMessage="Admin: {version}"
                values={{ version: getAppVersion() }}
              />
            </Typography>
            <Typography variant="body2">
              <FormattedMessage
                defaultMessage="Server: {version}"
                values={{
                  version: serverVersion ?? <CircularProgress size={12} />,
                }}
              />
            </Typography>
          </CardContent>
        </Card>

        <Box>
          <Button variant="outlined" color="error" onClick={signOut}>
            <FormattedMessage defaultMessage="Sign Out" />
          </Button>
        </Box>
      </Box>
    </TabLayout>
  );
}
