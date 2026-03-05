import { ArrowOutwardRounded, Download } from "@mui/icons-material";
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Link,
  Stack,
  Typography,
} from "@mui/material";
import { getVersion } from "@tauri-apps/api/app";
import { invoke } from "@tauri-apps/api/core";
import { appLogDir } from "@tauri-apps/api/path";
import { revealItemInDir } from "@tauri-apps/plugin-opener";
import { useState } from "react";
import { FormattedMessage, useIntl } from "react-intl";
import { showErrorSnackbar, showSnackbar } from "../../actions/app.actions";
import { useAsyncData } from "../../hooks/async.hooks";
import { produceAppState, useAppStore } from "../../store";
import { getEffectiveStylingMode } from "../../utils/feature.utils";
import {
  getEffectivePlan,
  getIsOnTrial,
  getMyMember,
  getTrialDaysRemaining,
} from "../../utils/member.utils";
import {
  getAgentModePrefs,
  getGenerativePrefs,
  getMyEffectiveUserId,
  getMyUser,
  getTranscriptionPrefs,
} from "../../utils/user.utils";

function useDiagnosticsData() {
  const version = useAsyncData(getVersion, []);

  const storeData = useAppStore((state) => {
    const user = getMyUser(state);
    const member = getMyMember(state);
    const userId = getMyEffectiveUserId(state);
    const plan = getEffectivePlan(state);
    const isOnTrial = getIsOnTrial(state);
    const trialDaysRemaining = getTrialDaysRemaining(state);
    const transcriptionPrefs = getTranscriptionPrefs(state);
    const postProcessingPrefs = getGenerativePrefs(state);
    const agentModePrefs = getAgentModePrefs(state);
    const stylingMode = getEffectiveStylingMode(state);
    const isEnterprise = state.isEnterprise;
    const settings = state.settings;

    return {
      userId,
      userName: user?.name ?? "Guest",
      userEmail: state.auth?.email ?? null,
      plan,
      isOnTrial,
      trialDaysRemaining,
      memberPlan: member?.plan ?? null,
      transcriptionMode: transcriptionPrefs.mode,
      postProcessingMode: postProcessingPrefs.mode,
      agentMode: agentModePrefs.mode,
      stylingMode,
      isEnterprise,
      autoLaunchEnabled: settings.autoLaunchEnabled,
      transcriptionModelSize: settings.aiTranscription.modelSize,
      transcriptionDevice: settings.aiTranscription.device,
    };
  });

  return { version, ...storeData };
}

function buildDiagnosticsText(
  data: ReturnType<typeof useDiagnosticsData>,
): string {
  const lines: string[] = [
    "=== Voquill Diagnostics ===",
    `Generated: ${new Date().toISOString()}`,
    "",
    "--- Version ---",
    `App Version: ${data.version.state === "success" ? data.version.data : "unknown"}`,
    "",
    "--- User ---",
    `User ID: ${data.userId}`,
    `Name: ${data.userName}`,
    `Email: ${data.userEmail ?? "N/A"}`,
    "",
    "--- Membership ---",
    `Plan: ${data.plan}`,
    `Member Plan: ${data.memberPlan ?? "N/A"}`,
    `On Trial: ${data.isOnTrial}`,
    `Trial Days Remaining: ${data.trialDaysRemaining ?? "N/A"}`,
    `Enterprise: ${data.isEnterprise}`,
    "",
    "--- Transcription ---",
    `Mode: ${data.transcriptionMode}`,
    `Model Size: ${data.transcriptionModelSize}`,
    `Device: ${data.transcriptionDevice}`,
    "",
    "--- Post Processing ---",
    `Mode: ${data.postProcessingMode}`,
    "",
    "--- Agent Mode ---",
    `Mode: ${data.agentMode}`,
    "",
    "--- Local Settings ---",
    `Styling Mode: ${data.stylingMode}`,
    `Auto Launch: ${data.autoLaunchEnabled}`,
  ];

  return lines.join("\n");
}

type InfoRowProps = {
  label: string;
  value: string;
};

const InfoRow = ({ label, value }: InfoRowProps) => (
  <Stack direction="row" justifyContent="space-between" spacing={2}>
    <Typography variant="body2" color="text.secondary">
      {label}
    </Typography>
    <Typography variant="body2" fontWeight={500} sx={{ textAlign: "right" }}>
      {value}
    </Typography>
  </Stack>
);

const SectionTitle = ({ children }: { children: React.ReactNode }) => (
  <Typography variant="subtitle2" fontWeight={700} sx={{ pt: 2, mb: 0.5 }}>
    {children}
  </Typography>
);

export const DiagnosticsDialog = () => {
  const open = useAppStore((state) => state.settings.diagnosticsDialogOpen);
  const data = useDiagnosticsData();
  const intl = useIntl();
  const [exporting, setExporting] = useState(false);

  const handleClose = () => {
    produceAppState((draft) => {
      draft.settings.diagnosticsDialogOpen = false;
    });
  };

  const handleDownload = async () => {
    setExporting(true);
    try {
      const diagnosticsInfo = buildDiagnosticsText(data);
      const saved = await invoke<boolean>("export_diagnostics", {
        diagnosticsInfo,
      });
      if (saved) {
        showSnackbar(
          intl.formatMessage({
            defaultMessage: "Diagnostics exported successfully",
          }),
        );
      }
    } catch (error) {
      showErrorSnackbar(error);
    } finally {
      setExporting(false);
    }
  };

  const version = data.version.state === "success" ? data.version.data : "...";

  return (
    <Dialog open={open} onClose={handleClose} fullWidth maxWidth="xs">
      <DialogTitle
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <FormattedMessage defaultMessage="Diagnostics" />
        <Link
          component="button"
          variant="body2"
          underline="hover"
          onClick={async () => {
            const dir = await appLogDir();
            await revealItemInDir(dir);
          }}
          sx={{ display: "flex", alignItems: "center", gap: 0.5 }}
        >
          <FormattedMessage defaultMessage="Open" />
          <ArrowOutwardRounded sx={{ fontSize: 14 }} />
        </Link>
      </DialogTitle>
      <DialogContent sx={{ minWidth: 400 }}>
        <Stack spacing={0.5}>
          <SectionTitle>
            <FormattedMessage defaultMessage="Version" />
          </SectionTitle>
          <InfoRow
            label={intl.formatMessage({ defaultMessage: "App version" })}
            value={version}
          />

          <SectionTitle>
            <FormattedMessage defaultMessage="User" />
          </SectionTitle>
          <InfoRow
            label={intl.formatMessage({ defaultMessage: "User ID" })}
            value={data.userId}
          />

          <SectionTitle>
            <FormattedMessage defaultMessage="Processing" />
          </SectionTitle>
          <InfoRow
            label={intl.formatMessage({ defaultMessage: "Transcription" })}
            value={data.transcriptionMode}
          />
          <InfoRow
            label={intl.formatMessage({ defaultMessage: "Post processing" })}
            value={data.postProcessingMode}
          />
          <InfoRow
            label={intl.formatMessage({ defaultMessage: "Agent mode" })}
            value={data.agentMode}
          />
          <InfoRow
            label={intl.formatMessage({ defaultMessage: "Styling mode" })}
            value={data.stylingMode}
          />
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose}>
          <FormattedMessage defaultMessage="Close" />
        </Button>
        <Button
          variant="contained"
          startIcon={<Download />}
          onClick={handleDownload}
          disabled={exporting}
        >
          <FormattedMessage defaultMessage="Download" />
        </Button>
      </DialogActions>
    </Dialog>
  );
};
