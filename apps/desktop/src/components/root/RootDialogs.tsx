import { AudioDialog } from "../settings/AudioDialog";
import { ClearLocalDataDialog } from "../settings/ClearLocalDataDialog";
import { MicrophoneDialog } from "../settings/MicrophoneDialog";
import { ShortcutsDialog } from "../settings/ShortcutsDialog";

export const RootDialogs = () => {
  return (
    <>
      <MicrophoneDialog />
      <AudioDialog />
      <ShortcutsDialog />
      <ClearLocalDataDialog />
    </>
  );
};
