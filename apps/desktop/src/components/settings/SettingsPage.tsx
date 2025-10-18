import {
  ArrowOutwardRounded,
  DeleteForeverOutlined,
  DescriptionOutlined,
  KeyboardAltOutlined,
  MicOutlined,
  PrivacyTipOutlined,
  VolumeUpOutlined,
} from "@mui/icons-material";
import { Stack, Typography } from "@mui/material";
import { openUrl } from "@tauri-apps/plugin-opener";
import { produceAppState } from "../../store";
import { ListTile } from "../common/ListTile";
import { Section } from "../common/Section";
import { DashboardEntryLayout } from "../dashboard/DashboardEntryLayout";
import { AudioDialog } from "./AudioDialog";
import { ClearLocalDataDialog } from "./ClearLocalDataDialog";
import { MicrophoneDialog } from "./MicrophoneDialog";
import { ShortcutsDialog } from "./ShortcutsDialog";

export default function SettingsPage() {
  const openMicrophoneDialog = () => {
    produceAppState((draft) => {
      draft.settings.microphoneDialogOpen = true;
    });
  };

  const openAudioDialog = () => {
    produceAppState((draft) => {
      draft.settings.audioDialogOpen = true;
    });
  };

  const openShortcutsDialog = () => {
    produceAppState((draft) => {
      draft.settings.shortcutsDialogOpen = true;
    });
  };

  const openClearLocalDataDialog = () => {
    produceAppState((draft) => {
      draft.settings.clearLocalDataDialogOpen = true;
    });
  };

  const general = (
    <Section title="General">
      <ListTile
        title="Microphone"
        leading={<MicOutlined />}
        onClick={openMicrophoneDialog}
      />
      <ListTile
        title="Audio"
        leading={<VolumeUpOutlined />}
        onClick={openAudioDialog}
      />
      <ListTile
        title="Hotkey shortcuts"
        leading={<KeyboardAltOutlined />}
        onClick={openShortcutsDialog}
      />
    </Section>
  );

  const advanced = (
    <Section
      title="Advanced"
      description="Manage your account preferences and settings."
    >
      <ListTile
        title="Terms & conditions"
        onClick={() => openUrl("https://voquill.com/terms")}
        trailing={<ArrowOutwardRounded />}
        leading={<DescriptionOutlined />}
      />
      <ListTile
        title="Privacy policy"
        onClick={() => openUrl("https://voquill.com/privacy")}
        trailing={<ArrowOutwardRounded />}
        leading={<PrivacyTipOutlined />}
      />
    </Section>
  );

  const dangerZone = (
    <Section
      title="Danger zone"
      description="Be careful with these actions. They can have significant consequences for your account."
    >
      <ListTile
        title="Clear local data"
        leading={<DeleteForeverOutlined />}
        onClick={openClearLocalDataDialog}
      />
    </Section>
  );

  return (
    <>
      <MicrophoneDialog />
      <AudioDialog />
      <ShortcutsDialog />
      <ClearLocalDataDialog />
      <DashboardEntryLayout>
        <Stack direction="column">
          <Typography variant="h4" fontWeight={700} sx={{ marginBottom: 4 }}>
            Settings
          </Typography>
          {general}
          {advanced}
          {dangerZone}
        </Stack>
      </DashboardEntryLayout>
    </>
  );
}
