import { Stack, Typography } from "@mui/material";
import { FormattedMessage } from "react-intl";
import { loadTones } from "../../actions/tone.actions";
import { useAsyncEffect } from "../../hooks/async.hooks";
import { useAppStore } from "../../store";
import { getActiveManualToneIds } from "../../utils/tone.utils";
import { VirtualizedListPage } from "../common/VirtualizedListPage";
import { ManualAddStyle } from "./ManualAddStyle";
import { ManualStylingRow } from "./ManualStylingRow";

export function ManualStylingLayout() {
  useAsyncEffect(async () => {
    await loadTones();
  }, []);

  const toneIds = useAppStore((state) => getActiveManualToneIds(state));

  return (
    <VirtualizedListPage
      title={<FormattedMessage defaultMessage="Writing Styles" />}
      subtitle={
        <FormattedMessage defaultMessage="Choose different writing styles to change how you sound." />
      }
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
