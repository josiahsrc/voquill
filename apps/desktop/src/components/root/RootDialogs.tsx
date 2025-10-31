import { AIPostProcessingDialog } from "../settings/AIPostProcessingDialog";
import { AITranscriptionDialog } from "../settings/AITranscriptionDialog";
import { AudioDialog } from "../settings/AudioDialog";
import { ClearLocalDataDialog } from "../settings/ClearLocalDataDialog";
import { MicrophoneDialog } from "../settings/MicrophoneDialog";
import { ShortcutsDialog } from "../settings/ShortcutsDialog";
import { PermissionsDialog } from "./PermissionsDialog";
import { UpdateDialog } from "./UpdateDialog";

export const RootDialogs = () => {
  return (
    <>
      <UpdateDialog />
      <PermissionsDialog />
      <AITranscriptionDialog />
      <AIPostProcessingDialog />
      <MicrophoneDialog />
      <AudioDialog />
      <ShortcutsDialog />
      <ClearLocalDataDialog />
    </>
  );
};
