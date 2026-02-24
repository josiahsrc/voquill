import { PaymentDialog } from "../payment/PaymentDialog";
import { AIAgentModeDialog } from "../settings/AIAgentModeDialog";
import { AIPostProcessingDialog } from "../settings/AIPostProcessingDialog";
import { AITranscriptionDialog } from "../settings/AITranscriptionDialog";
import { AppKeybindingsDialog } from "../settings/AppKeybindingsDialog";
import { AudioDialog } from "../settings/AudioDialog";
import { ClearLocalDataDialog } from "../settings/ClearLocalDataDialog";
import { MicrophoneDialog } from "../settings/MicrophoneDialog";
import { DictationLanguageDialog } from "../settings/DictationLanguageDialog";
import { MoreSettingsDialog } from "../settings/MoreSettingsDialog";
import { ProfileDialog } from "../settings/ProfileDialog";
import { ShortcutsDialog } from "../settings/ShortcutsDialog";
import { UpgradePlanDialog } from "../pricing/UpgradePlanDialog";
import { UpdateDialog } from "./UpdateDialog";
import { DeleteAccountDialog } from "../settings/DeleteAccountDialog";
import { ToneEditorDialog } from "../tones/ToneEditorDialog";
import { RetranscribeDialog } from "../transcriptions/RetranscribeDialog";

export const RootDialogs = () => {
  return (
    <>
      <UpdateDialog />
      <RetranscribeDialog />
      <ToneEditorDialog />
      <AITranscriptionDialog />
      <AIPostProcessingDialog />
      <AIAgentModeDialog />
      <ProfileDialog />
      <MicrophoneDialog />
      <AudioDialog />
      <ShortcutsDialog />
      <ClearLocalDataDialog />
      <UpgradePlanDialog />
      <PaymentDialog />
      <DeleteAccountDialog />
      <MoreSettingsDialog />
      <DictationLanguageDialog />
      <AppKeybindingsDialog />
    </>
  );
};
