import {
  ArrowOutwardRounded,
  AutoAwesomeOutlined,
  AutoFixHighOutlined,
  Close,
  DeleteForeverOutlined,
  DescriptionOutlined,
  GraphicEqOutlined,
  LockOutlined,
  LogoutOutlined,
  MicOutlined,
  MoreVertOutlined,
  PaymentOutlined,
  PersonRemoveOutlined,
  PrivacyTipOutlined,
  RocketLaunchOutlined,
  VolumeUpOutlined,
  WarningAmberOutlined,
} from "@mui/icons-material";
import {
  Box,
  Button,
  Chip,
  IconButton,
  Link,
  MenuItem,
  Select,
  SelectChangeEvent,
  Stack,
  Switch,
  Tooltip,
  Typography,
} from "@mui/material";
import { invokeHandler } from "@repo/functions";
import { openUrl } from "@tauri-apps/plugin-opener";
import { ChangeEvent, useState } from "react";
import { FormattedMessage, useIntl } from "react-intl";
import { showErrorSnackbar } from "../../actions/app.actions";
import { setAutoLaunchEnabled } from "../../actions/settings.actions";
import { loadTones } from "../../actions/tone.actions";
import {
  setPreferredLanguage,
  setLanguageSwitchEnabled,
  setSecondaryDictationLanguage,
} from "../../actions/user.actions";
import { getAuthRepo } from "../../repos";
import { produceAppState, useAppStore } from "../../store";
import { registerHotkeys } from "../../utils/app.utils";
import { createId } from "../../utils/id.utils";
import {
  DICTATION_LANGUAGE_OPTIONS,
  WHISPER_LANGUAGES,
} from "../../utils/language.utils";
import { getIsPaying } from "../../utils/member.utils";
import {
  getDetectedSystemLocale,
  getHasEmailProvider,
  getIsSignedIn,
  getMyUser,
} from "../../utils/user.utils";
import { HotKey } from "../common/HotKey";
import { ListTile } from "../common/ListTile";
import { Section } from "../common/Section";
import { DashboardEntryLayout } from "../dashboard/DashboardEntryLayout";
import { getHotkeyRepo } from "../../repos";
import type { Hotkey } from "@repo/types";
import {
  ADDITIONAL_LANGUAGE_HOTKEY_PREFIX,
  getAdditionalLanguageActionName,
  getAdditionalLanguageCode,
  getDefaultHotkeyCombosForAction,
} from "../../utils/keyboard.utils";
import { HotkeySetting } from "./HotkeySetting";
import {
  AGENT_DICTATE_HOTKEY,
  DICTATE_HOTKEY,
  LANGUAGE_SWITCH_HOTKEY,
} from "../../utils/keyboard.utils";

type DraftLanguageEntry = {
  id: string;
  language: string | null;
  keys: string[];
};

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
  const intl = useIntl();

  const dictationLanguage = useAppStore((state) => {
    const user = getMyUser(state);
    return user?.preferredLanguage ?? getDetectedSystemLocale();
  });

  const { languageSwitchEnabled, secondaryLanguage } = useAppStore((state) => ({
    languageSwitchEnabled: state.settings.languageSwitch.enabled,
    secondaryLanguage: state.settings.languageSwitch.secondaryLanguage,
  }));

  const [draftLanguages, setDraftLanguages] = useState<DraftLanguageEntry[]>([]);

  const [hotkeyIds, hotkeyById] = useAppStore((state) => [
    state.settings.hotkeyIds,
    state.hotkeyById,
  ]);
  const additionalLanguageHotkeys = Array.from(
    new Set(
      Object.values(hotkeyById)
        .filter(
          (hotkey): hotkey is Hotkey =>
            Boolean(hotkey) &&
            hotkey.actionName.startsWith(ADDITIONAL_LANGUAGE_HOTKEY_PREFIX),
        )
        .map((hotkey) => hotkey.actionName),
    ),
  );

  const usedLanguages = (() => {
    const used = new Set<string>();
    used.add(dictationLanguage);
    for (const actionName of additionalLanguageHotkeys) {
      const code = getAdditionalLanguageCode(actionName);
      if (code) {
        used.add(code);
      }
    }
    for (const entry of draftLanguages) {
      if (entry.language) {
        used.add(entry.language);
      }
    }
    return used;
  })();

  const getAvailableLanguageOptions = (current: string | null) =>
    DICTATION_LANGUAGE_OPTIONS.filter(([value]) => {
      if (current && value === current) {
        return true;
      }
      return !usedLanguages.has(value);
    });

  const getHotkeysForAction = (actionName: string) =>
    hotkeyIds
      .map((id) => hotkeyById[id])
      .filter(
        (hotkey): hotkey is Hotkey =>
          Boolean(hotkey) && hotkey.actionName === actionName,
      );

  const saveHotkey = async (
    actionName: string,
    keys: string[],
    id?: string,
  ) => {
    const newValue: Hotkey = {
      id: id ?? createId(),
      actionName,
      keys,
    };

    try {
      produceAppState((draft) => {
        registerHotkeys(draft, [newValue]);
        if (!draft.settings.hotkeyIds.includes(newValue.id)) {
          draft.settings.hotkeyIds.push(newValue.id);
        }
        draft.settings.hotkeysStatus = "success";
      });
      await getHotkeyRepo().saveHotkey(newValue);
    } catch (error) {
      console.error("Failed to save hotkey", error);
      showErrorSnackbar("Failed to save hotkey. Please try again.");
    }
  };

  const deleteHotkey = async (id: string) => {
    try {
      produceAppState((draft) => {
        delete draft.hotkeyById[id];
        draft.settings.hotkeyIds = draft.settings.hotkeyIds.filter(
          (hid) => hid !== id,
        );
      });
      await getHotkeyRepo().deleteHotkey(id);
    } catch (error) {
      console.error("Failed to delete hotkey", error);
      showErrorSnackbar("Failed to delete hotkey. Please try again.");
    }
  };

  const dictationLanguageWarning = useAppStore((state) => {
    const hasPostProcessingEnabled =
      state.settings.aiPostProcessing.mode !== "none";
    if (hasPostProcessingEnabled) {
      return null;
    }

    const isWhisperLang = dictationLanguage in WHISPER_LANGUAGES;
    if (!isWhisperLang) {
      return intl.formatMessage({
        defaultMessage:
          "Be sure to enable AI post processing when using this language for the best results.",
      });
    }

    return null;
  });

  const handleDictationLanguageChange = (event: SelectChangeEvent<string>) => {
    const nextValue = event.target.value;
    void setPreferredLanguage(nextValue).then(() => {
      loadTones();
    });
  };

  const handleSecondaryLanguageChange = (event: SelectChangeEvent<string>) => {
    const nextValue = event.target.value;
    void setSecondaryDictationLanguage(nextValue);
  };

  const primaryHotkeys = getHotkeysForAction(DICTATE_HOTKEY);
  const primaryHotkey = primaryHotkeys[0];
  const primaryDefaultCombo =
    getDefaultHotkeyCombosForAction(DICTATE_HOTKEY)[0] ?? [];
  const primaryKeys = primaryHotkey?.keys ?? primaryDefaultCombo;

  const addDraftLanguage = () => {
    setDraftLanguages((prev) => [
      ...prev,
      { id: createId(), language: null, keys: [] },
    ]);
  };

  const updateDraftLanguage = (id: string, nextLanguage: string | null) => {
    setDraftLanguages((prev) =>
      prev.map((entry) =>
        entry.id === id ? { ...entry, language: nextLanguage } : entry,
      ),
    );
  };

  const updateDraftKeys = (id: string, nextKeys: string[]) => {
    setDraftLanguages((prev) =>
      prev.map((entry) =>
        entry.id === id ? { ...entry, keys: nextKeys } : entry,
      ),
    );
  };

  const removeDraftLanguage = (id: string) => {
    setDraftLanguages((prev) => prev.filter((entry) => entry.id !== id));
  };

  const tryPersistDraft = async (entry: DraftLanguageEntry) => {
    if (!entry.language || entry.keys.length === 0) {
      return;
    }
    const actionName = getAdditionalLanguageActionName(entry.language);
    await saveHotkey(actionName, entry.keys);
    removeDraftLanguage(entry.id);
  };

  const handleAdditionalLanguageChange = async (
    actionName: string,
    nextLanguage: string,
  ) => {
    if (actionName === getAdditionalLanguageActionName(nextLanguage)) {
      return;
    }
    const existingHotkeys = getHotkeysForAction(actionName);
    await Promise.all(
      existingHotkeys.map((hotkey) =>
        deleteHotkey(hotkey.id),
      ),
    );
    if (existingHotkeys.length === 0) {
      return;
    }
    await Promise.all(
      existingHotkeys.map((hotkey) =>
        saveHotkey(getAdditionalLanguageActionName(nextLanguage), hotkey.keys),
      ),
    );
  };

  const additionalLanguagesDisabled = languageSwitchEnabled;

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

  const openAgentModeDialog = () => {
    produceAppState((draft) => {
      draft.settings.agentModeDialogOpen = true;
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


  const openMoreSettingsDialog = () => {
    produceAppState((draft) => {
      draft.settings.moreSettingsDialogOpen = true;
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
        title={<FormattedMessage defaultMessage="More settings" />}
        leading={<MoreVertOutlined />}
        onClick={openMoreSettingsDialog}
      />
    </Section>
  );

  const hotkeysAndLanguages = (
    <Section title={<FormattedMessage defaultMessage="Hotkeys and Languages" />}>
      <Stack spacing={3}>
        <Stack spacing={1}>
          <Typography variant="subtitle1" fontWeight={600}>
            <FormattedMessage defaultMessage="Dictation language" />
          </Typography>
          <Stack direction="row" spacing={2} alignItems="center">
            <Box
              onClick={(event) => event.stopPropagation()}
              sx={{
                minWidth: 200,
                flex: 1,
                display: "flex",
                alignItems: "center",
                gap: 1,
              }}
            >
              {dictationLanguageWarning && (
                <Tooltip
                  title={
                    <Box>
                      {dictationLanguageWarning}{" "}
                      <Link
                        component="button"
                        color="inherit"
                        sx={{ verticalAlign: "baseline" }}
                        onClick={openPostProcessingDialog}
                      >
                        <FormattedMessage defaultMessage="Fix issue" />
                      </Link>
                    </Box>
                  }
                  slotProps={{
                    popper: {
                      modifiers: [
                        { name: "offset", options: { offset: [0, -8] } },
                      ],
                    },
                  }}
                >
                  <WarningAmberOutlined color="warning" fontSize="small" />
                </Tooltip>
              )}
              <Select
                value={dictationLanguage}
                onChange={handleDictationLanguageChange}
                size="small"
                variant="outlined"
                fullWidth
                inputProps={{ "aria-label": "Dictation language" }}
                MenuProps={{
                  PaperProps: {
                    style: {
                      maxHeight: 300,
                    },
                  },
                }}
              >
                {DICTATION_LANGUAGE_OPTIONS.map(([value, label]) => (
                  <MenuItem key={value} value={value}>
                    {label}
                  </MenuItem>
                ))}
              </Select>
            </Box>
            <HotKey
              value={primaryKeys}
              onChange={(keys) => saveHotkey(DICTATE_HOTKEY, keys, primaryHotkey?.id)}
            />
          </Stack>
          <Typography variant="body2" color="textSecondary">
            <FormattedMessage defaultMessage="Pressing this hotkey starts dictation in the selected language." />
          </Typography>
        </Stack>
        {languageSwitchEnabled && (
          <Stack spacing={1}>
            <Typography variant="subtitle2" fontWeight={600}>
              <FormattedMessage defaultMessage="Secondary language" />
            </Typography>
            <Box
              onClick={(event) => event.stopPropagation()}
              sx={{
                minWidth: 200,
                display: "flex",
                alignItems: "center",
                gap: 1,
              }}
            >
              <Select
                value={secondaryLanguage ?? "fr"}
                onChange={handleSecondaryLanguageChange}
                size="small"
                variant="outlined"
                fullWidth
                inputProps={{ "aria-label": "Secondary dictation language" }}
                MenuProps={{
                  PaperProps: {
                    style: {
                      maxHeight: 300,
                    },
                  },
                }}
              >
                {DICTATION_LANGUAGE_OPTIONS.map(([value, label]) => (
                  <MenuItem key={value} value={value}>
                    {label}
                  </MenuItem>
                ))}
              </Select>
            </Box>
          </Stack>
        )}
        <Stack
          spacing={2}
          sx={{
            opacity: additionalLanguagesDisabled ? 0.5 : 1,
            pointerEvents: additionalLanguagesDisabled ? "none" : "auto",
          }}
        >
          {additionalLanguageHotkeys.map((actionName) => {
            const language = getAdditionalLanguageCode(actionName);
            if (!language) {
              return null;
            }
            const hotkeys = getHotkeysForAction(actionName);
            const hotkey = hotkeys[0];
            const currentKeys = hotkey?.keys ?? [];
            return (
              <Stack key={actionName} direction="row" spacing={2} alignItems="center">
                <Select
                  value={language}
                  onChange={(event) =>
                    void handleAdditionalLanguageChange(
                      actionName,
                      event.target.value,
                    )
                  }
                  size="small"
                  variant="outlined"
                  sx={{ minWidth: 200 }}
                  inputProps={{ "aria-label": "Additional dictation language" }}
                  MenuProps={{
                    PaperProps: {
                      style: {
                        maxHeight: 300,
                      },
                    },
                  }}
                >
                  {getAvailableLanguageOptions(language).map(([value, label]) => (
                    <MenuItem key={value} value={value}>
                      {label}
                    </MenuItem>
                  ))}
                </Select>
                <HotKey
                  value={currentKeys}
                  onChange={(keys) => saveHotkey(actionName, keys, hotkey?.id)}
                />
                <IconButton
                  size="small"
                  onClick={() =>
                    void Promise.all(
                      hotkeys.map((entry) => deleteHotkey(entry.id)),
                    )
                  }
                  aria-label="Remove additional language"
                >
                  <Close fontSize="small" />
                </IconButton>
              </Stack>
            );
          })}
          {draftLanguages.map((entry) => (
            <Stack key={entry.id} direction="row" spacing={2} alignItems="center">
              <Select
                value={entry.language ?? ""}
                onChange={(event) => {
                  const nextLanguage = event.target.value;
                  updateDraftLanguage(entry.id, nextLanguage);
                  const updated = { ...entry, language: nextLanguage };
                  void tryPersistDraft(updated);
                }}
                size="small"
                variant="outlined"
                sx={{ minWidth: 200 }}
                inputProps={{ "aria-label": "Additional dictation language" }}
                MenuProps={{
                  PaperProps: {
                    style: {
                      maxHeight: 300,
                    },
                  },
                }}
              >
                {getAvailableLanguageOptions(entry.language).map(([value, label]) => (
                  <MenuItem key={value} value={value}>
                    {label}
                  </MenuItem>
                ))}
              </Select>
              <HotKey
                value={entry.keys}
                onChange={(keys) => {
                  updateDraftKeys(entry.id, keys);
                  void tryPersistDraft({ ...entry, keys });
                }}
              />
              <IconButton
                size="small"
                onClick={() => removeDraftLanguage(entry.id)}
                aria-label="Remove additional language"
              >
                <Close fontSize="small" />
              </IconButton>
            </Stack>
          ))}
          <Box>
            <Button
              variant="text"
              onClick={addDraftLanguage}
              disabled={additionalLanguagesDisabled}
            >
              <FormattedMessage defaultMessage="Add Additional Language" />
            </Button>
          </Box>
        </Stack>
        <Stack spacing={2}>
          <HotkeySetting
            title={<FormattedMessage defaultMessage="Agent mode" />}
            description={
              <FormattedMessage defaultMessage="Dictate commands for the AI to follow instead of just cleaning up text." />
            }
            actionName={AGENT_DICTATE_HOTKEY}
          />
          <HotkeySetting
            title={<FormattedMessage defaultMessage="Switch dictation language" />}
            description={
              <FormattedMessage defaultMessage="Quickly switch between your primary and secondary dictation languages." />
            }
            actionName={LANGUAGE_SWITCH_HOTKEY}
            enabled={languageSwitchEnabled}
            onEnabledChange={(enabled) => {
              void setLanguageSwitchEnabled(enabled);
            }}
          />
        </Stack>
      </Stack>
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
      <ListTile
        title={
          <Stack direction="row" alignItems="center">
            <FormattedMessage defaultMessage="Agent mode" />
            <Chip label="Beta" size="small" color="primary" sx={{ ml: 1 }} />
          </Stack>
        }
        leading={<AutoAwesomeOutlined />}
        onClick={openAgentModeDialog}
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
      {!isSignedIn && (
        <ListTile
          title={<FormattedMessage defaultMessage="Clear local data" />}
          leading={<DeleteForeverOutlined />}
          onClick={openClearLocalDataDialog}
        />
      )}
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
        {hotkeysAndLanguages}
        {processing}
        {advanced}
        {dangerZone}
      </Stack>
    </DashboardEntryLayout>
  );
}
