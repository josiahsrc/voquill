import {
  ArrowOutwardRounded,
  AutoFixHighOutlined,
  DeleteForeverOutlined,
  DescriptionOutlined,
  GraphicEqOutlined,
  KeyboardAltOutlined,
  LanguageOutlined,
  LockOutlined,
  LogoutOutlined,
  MicOutlined,
  PaymentOutlined,
  PersonRemoveOutlined,
  PrivacyTipOutlined,
  RocketLaunchOutlined,
  VolumeUpOutlined,
} from "@mui/icons-material";
import {
  Box,
  MenuItem,
  Select,
  SelectChangeEvent,
  Stack,
  Switch,
  Typography,
} from "@mui/material";
import { invokeHandler } from "@repo/functions";
import { openUrl } from "@tauri-apps/plugin-opener";
import { ChangeEvent, useState } from "react";
import { FormattedMessage } from "react-intl";
import { showErrorSnackbar } from "../../actions/app.actions";
import { setAutoLaunchEnabled } from "../../actions/settings.actions";
import { loadTones } from "../../actions/tone.actions";
import { setPreferredLanguage } from "../../actions/user.actions";
import { matchSupportedLocale } from "../../i18n";
import { DEFAULT_LOCALE, type Locale } from "../../i18n/config";
import { getAuthRepo } from "../../repos";
import { produceAppState, useAppStore } from "../../store";
import { LANGUAGE_DISPLAY_NAMES } from "../../utils/language.utils";
import { getIsPaying } from "../../utils/member.utils";
import {
  getHasEmailProvider,
  getIsSignedIn,
  getMyUser,
} from "../../utils/user.utils";
import { ListTile } from "../common/ListTile";
import { Section } from "../common/Section";
import { DashboardEntryLayout } from "../dashboard/DashboardEntryLayout";

const LANGUAGE_OPTIONS = Object.entries(LANGUAGE_DISPLAY_NAMES) as [
  Locale,
  string,
][];

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

  const preferredLanguage = useAppStore((state) => {
    const user = getMyUser(state);
    const normalized = matchSupportedLocale(user?.preferredLanguage);
    return normalized ?? DEFAULT_LOCALE;
  });

  const handlePreferredLanguageChange = (event: SelectChangeEvent<string>) => {
    const nextValue = (event.target.value as Locale) ?? DEFAULT_LOCALE;
    void setPreferredLanguage(nextValue).then(() => {
      loadTones(); // tones need to be reloaded to get the localized names
    });
  };

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
        {},
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
    <Section title={<FormattedMessage defaultMessage="General" />}>
      <ListTile
        title={<FormattedMessage defaultMessage="Start on system startup" />}
        leading={<RocketLaunchOutlined />}
        disableRipple={true}
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
        title={<FormattedMessage defaultMessage="Microphone" />}
        leading={<MicOutlined />}
        onClick={openMicrophoneDialog}
      />
      <ListTile
        title={<FormattedMessage defaultMessage="Audio" />}
        leading={<VolumeUpOutlined />}
        onClick={openAudioDialog}
      />
      <ListTile
        title={<FormattedMessage defaultMessage="Hotkey shortcuts" />}
        leading={<KeyboardAltOutlined />}
        onClick={openShortcutsDialog}
      />
      <ListTile
        title={<FormattedMessage defaultMessage="Preferred language" />}
        leading={<LanguageOutlined />}
        disableRipple={true}
        trailing={
          <Box
            onClick={(event) => event.stopPropagation()}
            sx={{ minWidth: 160 }}
          >
            <Select
              value={preferredLanguage}
              onChange={handlePreferredLanguageChange}
              size="small"
              variant="outlined"
              fullWidth
              inputProps={{ "aria-label": "Preferred language" }}
            >
              {LANGUAGE_OPTIONS.map(([value, label]) => (
                <MenuItem key={value} value={value}>
                  {label}
                </MenuItem>
              ))}
            </Select>
          </Box>
        }
      />
    </Section>
  );

  const processing = (
    <Section
      title={<FormattedMessage defaultMessage="Processing" />}
      description={
        <FormattedMessage defaultMessage="How Voquill should manage your transcriptions." />
      }
    >
      <ListTile
        title={<FormattedMessage defaultMessage="AI transcription" />}
        leading={<GraphicEqOutlined />}
        onClick={openTranscriptionDialog}
      />
      <ListTile
        title={<FormattedMessage defaultMessage="AI post processing" />}
        leading={<AutoFixHighOutlined />}
        onClick={openPostProcessingDialog}
      />
    </Section>
  );

  const advanced = (
    <Section
      title={<FormattedMessage defaultMessage="Advanced" />}
      description={
        <FormattedMessage defaultMessage="Manage your account preferences and settings." />
      }
    >
      {hasEmailProvider && (
        <ListTile
          title={<FormattedMessage defaultMessage="Change password" />}
          leading={<LockOutlined />}
          onClick={openChangePasswordDialog}
        />
      )}
      {isPaying && (
        <ListTile
          title={<FormattedMessage defaultMessage="Manage subscription" />}
          leading={<PaymentOutlined />}
          onClick={handleManageSubscription}
          disabled={manageSubscriptionLoading}
          trailing={<ArrowOutwardRounded />}
        />
      )}
      <ListTile
        title={<FormattedMessage defaultMessage="Terms & conditions" />}
        onClick={() => openUrl("https://voquill.com/terms")}
        trailing={<ArrowOutwardRounded />}
        leading={<DescriptionOutlined />}
      />
      <ListTile
        title={<FormattedMessage defaultMessage="Privacy policy" />}
        onClick={() => openUrl("https://voquill.com/privacy")}
        trailing={<ArrowOutwardRounded />}
        leading={<PrivacyTipOutlined />}
      />
      {isSignedIn && (
        <ListTile
          title={<FormattedMessage defaultMessage="Sign out" />}
          leading={<LogoutOutlined />}
          onClick={handleSignOut}
        />
      )}
    </Section>
  );

  const dangerZone = (
    <Section
      title={<FormattedMessage defaultMessage="Danger zone" />}
      description={
        <FormattedMessage defaultMessage="Be careful with these actions. They can have significant consequences for your account." />
      }
    >
      <ListTile
        title={<FormattedMessage defaultMessage="Clear local data" />}
        leading={<DeleteForeverOutlined />}
        onClick={openClearLocalDataDialog}
      />
      {isSignedIn && (
        <ListTile
          sx={{ mt: 1 }}
          title={<FormattedMessage defaultMessage="Delete account" />}
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
          <FormattedMessage defaultMessage="Settings" />
        </Typography>
        {general}
        {processing}
        {advanced}
        {dangerZone}
      </Stack>
    </DashboardEntryLayout>
  );
}
