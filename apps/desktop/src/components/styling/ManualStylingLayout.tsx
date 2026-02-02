import { Link, Stack, Typography } from "@mui/material";
import { FormattedMessage } from "react-intl";
import { loadTones } from "../../actions/tone.actions";
import { useAsyncEffect } from "../../hooks/async.hooks";
import { produceAppState, useAppStore } from "../../store";
import {
  getHotkeyCombosForAction,
  SWITCH_WRITING_STYLE_HOTKEY,
} from "../../utils/keyboard.utils";
import { getActiveManualToneIds } from "../../utils/tone.utils";
import { HotkeyBadge } from "../common/HotkeyBadge";
import { VirtualizedListPage } from "../common/VirtualizedListPage";
import { ManualAddStyle } from "./ManualAddStyle";
import { ManualStylingRow } from "./ManualStylingRow";

function StylingSubtitle() {
  const combos = useAppStore((state) =>
    getHotkeyCombosForAction(state, SWITCH_WRITING_STYLE_HOTKEY),
  );

  const openShortcuts = () =>
    produceAppState((draft) => {
      draft.settings.shortcutsDialogOpen = true;
    });

  if (combos.length === 0) {
    return (
      <FormattedMessage
        defaultMessage="Choose different writing styles to change how you sound. You can also <link>set up a hotkey</link> to switch between them faster."
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

  const hotkey = (
    <HotkeyBadge keys={combos[0]} onClick={openShortcuts} sx={{ mx: 0.25 }} />
  );

  return (
    <FormattedMessage
      defaultMessage="Choose different writing styles to change how you sound. Switch between them using the {hotkey} hotkey."
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
    <VirtualizedListPage
      title={<FormattedMessage defaultMessage="Writing Styles" />}
      heightMult={7}
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
