import { Link, Stack, Typography } from "@mui/material";
import { FormattedMessage } from "react-intl";
import { loadTones } from "../../actions/tone.actions";
import { useAsyncEffect } from "../../hooks/async.hooks";
import { produceAppState, useAppStore } from "../../store";
import {
  getHotkeyCombosForAction,
  SWITCH_WRITING_STYLE_BACKWARD_HOTKEY,
  SWITCH_WRITING_STYLE_FORWARD_HOTKEY,
} from "../../utils/keyboard.utils";
import { getActiveManualToneIds } from "../../utils/tone.utils";
import { HotkeyBadge } from "../common/HotkeyBadge";
import { ScrollListPage } from "../common/ScrollListPage";
import { ManualAddStyle } from "./ManualAddStyle";
import { ManualStylingRow } from "./ManualStylingRow";

function StylingSubtitle() {
  const forwardCombos = useAppStore((state) =>
    getHotkeyCombosForAction(state, SWITCH_WRITING_STYLE_FORWARD_HOTKEY),
  );
  const backwardCombos = useAppStore((state) =>
    getHotkeyCombosForAction(state, SWITCH_WRITING_STYLE_BACKWARD_HOTKEY),
  );

  const openShortcuts = () =>
    produceAppState((draft) => {
      draft.settings.shortcutsDialogOpen = true;
    });

  if (forwardCombos.length === 0 && backwardCombos.length === 0) {
    return (
      <FormattedMessage
        defaultMessage="Choose different writing styles to change how you sound. You can also <link>set up hotkeys</link> to cycle between them while dictating."
        values={{
          link: (chunks: React.ReactNode) => (
            <Link
              component="button"
              sx={{ verticalAlign: "baseline", fontSize: "inherit" }}
              onClick={openShortcuts}
            >
              {chunks}
            </Link>
          ),
        }}
      />
    );
  }

  const backwardHotkey = backwardCombos[0] ? (
    <HotkeyBadge
      keys={backwardCombos[0]}
      onClick={openShortcuts}
      sx={{ mx: 0.25 }}
    />
  ) : null;
  const forwardHotkey = forwardCombos[0] ? (
    <HotkeyBadge
      keys={forwardCombos[0]}
      onClick={openShortcuts}
      sx={{ mx: 0.25 }}
    />
  ) : null;

  if (backwardHotkey && forwardHotkey) {
    return (
      <FormattedMessage
        defaultMessage="Choose different writing styles to change how you sound. While dictating, press {backwardHotkey} or {forwardHotkey} to cycle between them."
        values={{ backwardHotkey, forwardHotkey }}
      />
    );
  }

  const hotkey = forwardHotkey ?? backwardHotkey;
  return (
    <FormattedMessage
      defaultMessage="Choose different writing styles to change how you sound. While dictating, press {hotkey} to cycle between them."
      values={{ hotkey }}
    />
  );
}

export function ManualStylingLayout() {
  useAsyncEffect(async () => {
    await loadTones();
  }, []);

  const toneIds = useAppStore((state) => getActiveManualToneIds(state));

  return (
    <ScrollListPage
      title={<FormattedMessage defaultMessage="Writing Styles" />}
      subtitle={<StylingSubtitle />}
      action={<ManualAddStyle />}
      items={toneIds}
      computeItemKey={(id) => id}
      renderItem={(id) => <ManualStylingRow key={id} id={id} />}
      emptyState={
        <Stack
          spacing={1}
          alignItems="flex-start"
          width={300}
          alignSelf="center"
          mx="auto"
        >
          <Typography variant="h6">
            <FormattedMessage defaultMessage="No styles yet" />
          </Typography>
          <Typography variant="body2">
            <FormattedMessage defaultMessage="Create a style to customize how your voice transcriptions are formatted and refined." />
          </Typography>
        </Stack>
      }
    />
  );
}
