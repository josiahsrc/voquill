import { Button, Stack, Typography } from "@mui/material";
import { Add } from "@mui/icons-material";
import { useCallback } from "react";
import { FormattedMessage } from "react-intl";
import { loadTones, openToneEditorDialog } from "../../actions/tone.actions";
import { useAsyncEffect } from "../../hooks/async.hooks";
import { useAppStore } from "../../store";
import { VirtualizedListPage } from "../common/VirtualizedListPage";
import { ManualStylingRow } from "./ManualStylingRow";

export function ManualStylingLayout() {
  useAsyncEffect(async () => {
    await loadTones();
  }, []);

  const toneIds = useAppStore((state) => state.tones.storedToneIds);

  const handleCreateTone = useCallback(() => {
    openToneEditorDialog({ mode: "create" });
  }, []);

  return (
    <VirtualizedListPage
      title={<FormattedMessage defaultMessage="Writing Styles" />}
      subtitle={
        <FormattedMessage defaultMessage="Choose different writing styles to change how you sound." />
      }
      action={
        <Button
          variant="contained"
          startIcon={<Add />}
          onClick={handleCreateTone}
        >
          <FormattedMessage defaultMessage="Create Style" />
        </Button>
      }
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
