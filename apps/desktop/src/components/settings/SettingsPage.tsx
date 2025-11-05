import {
  ArrowOutwardRounded,
  AutoFixHighOutlined,
  DeleteForeverOutlined,
  DescriptionOutlined,
  GraphicEqOutlined,
  KeyboardAltOutlined,
  LockOutlined,
  LogoutOutlined,
  MicOutlined,
  PaymentOutlined,
  PersonRemoveOutlined,
  PrivacyTipOutlined,
  RocketLaunchOutlined,
  VolumeUpOutlined,
} from "@mui/icons-material";
import { Stack, Switch, Typography } from "@mui/material";
import { invokeHandler } from "@repo/functions";
import { openUrl } from "@tauri-apps/plugin-opener";
import { ChangeEvent, useState } from "react";
import { showErrorSnackbar } from "../../actions/app.actions";
import { setAutoLaunchEnabled } from "../../actions/settings.actions";
import { getAuthRepo } from "../../repos";
import { produceAppState, useAppStore } from "../../store";
import { getIsPaying } from "../../utils/member.utils";
import { getHasEmailProvider, getIsSignedIn } from "../../utils/user.utils";
import { ListTile } from "../common/ListTile";
import { Section } from "../common/Section";
import { DashboardEntryLayout } from "../dashboard/DashboardEntryLayout";

export default function SettingsPage() {
  const hasEmailProvider = useAppStore(getHasEmailProvider);
  const isPaying = useAppStore(getIsPaying);
  const [manageSubscriptionLoading, setManageSubscriptionLoading] =
    useState(false);
  const isSignedIn = useAppStore(getIsSignedIn);
  const [autoLaunchEnabled, autoLaunchStatus] = useAppStore((state) => [
    state.settings.autoLaunchEnabled,
    state.settings.autoLaunchStatus,
  ]);
  const autoLaunchLoading = autoLaunchStatus === "loading";

  const openChangePasswordDialog = () => {
    produceAppState((state) => {
      state.settings.changePasswordDialogOpen = true;
    });
  };

  const openTranscriptionDialog = () => {
    produceAppState((draft) => {
      draft.settings.aiTranscriptionDialogOpen = true;
    });
  };

  const openPostProcessingDialog = () => {
    produceAppState((draft) => {
      draft.settings.aiPostProcessingDialogOpen = true;
    });
  };

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

  const openDeleteAccountDialog = () => {
    produceAppState((state) => {
      state.settings.deleteAccountDialog = true;
    });
  };

  const handleToggleAutoLaunch = (event: ChangeEvent<HTMLInputElement>) => {
    const enabled = event.target.checked;
    void setAutoLaunchEnabled(enabled);
  };

  const handleManageSubscription = async () => {
    setManageSubscriptionLoading(true);
    try {
      const data = await invokeHandler(
        "stripe/createCustomerPortalSession",
        {}
      );
      openUrl(data.url);
    } catch (error) {
      showErrorSnackbar(error);
    } finally {
      setManageSubscriptionLoading(false);
    }
  };

  const handleSignOut = async () => {
    await getAuthRepo().signOut();
  };

  const general = (
    <Section title="General">
      <ListTile
        title="Start on system startup"
        leading={<RocketLaunchOutlined />}
        trailing={
          <Switch
            edge="end"
            checked={autoLaunchEnabled}
            disabled={autoLaunchLoading}
            onChange={handleToggleAutoLaunch}
          />
        }
      />
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

  const processing = (
    <Section
      title="Processing"
      description="How Voquill should manage your transcriptions."
    >
      <ListTile
        title="AI transcription"
        leading={<GraphicEqOutlined />}
        onClick={openTranscriptionDialog}
      />
      <ListTile
        title="AI post processing"
        leading={<AutoFixHighOutlined />}
        onClick={openPostProcessingDialog}
      />
    </Section>
  );

  const advanced = (
    <Section
      title="Advanced"
      description="Manage your account preferences and settings."
    >
      {hasEmailProvider && (
        <ListTile
          title="Change password"
          leading={<LockOutlined />}
          onClick={openChangePasswordDialog}
        />
      )}
      {isPaying && (
        <ListTile
          title="Manage subscription"
          leading={<PaymentOutlined />}
          onClick={handleManageSubscription}
          disabled={manageSubscriptionLoading}
          trailing={<ArrowOutwardRounded />}
        />
      )}
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
      {isSignedIn && (
        <ListTile
          title="Sign out"
          leading={<LogoutOutlined />}
          onClick={handleSignOut}
        />
      )}
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
      {isSignedIn && (
        <ListTile
          sx={{ mt: 1 }}
          title="Delete account"
          leading={<PersonRemoveOutlined />}
          onClick={openDeleteAccountDialog}
        />
      )}
    </Section>
  );

  return (
    <DashboardEntryLayout>
      <Stack direction="column">
        <Typography variant="h4" fontWeight={700} sx={{ marginBottom: 4 }}>
          Settings
        </Typography>
        {general}
        {processing}
        {advanced}
        {dangerZone}
      </Stack>
    </DashboardEntryLayout>
  );
}
