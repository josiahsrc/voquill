import ContentCopyRoundedIcon from "@mui/icons-material/ContentCopyRounded";
import DeleteOutlineRoundedIcon from "@mui/icons-material/DeleteOutlineRounded";
import { Divider, IconButton, Stack, Typography } from "@mui/material";
import { getRec } from "@repo/utilities";
import dayjs from "dayjs";
import { useCallback } from "react";
import { showErrorSnackbar } from "../../actions/app.actions";
import { getTranscriptionRepo } from "../../repos";
import { produceAppState, useAppStore } from "../../store";
import { TypographyWithMore } from "../common/TypographyWithMore";

export type TranscriptionRowProps = {
  id: string;
};

export const TranscriptionRow = ({ id }: TranscriptionRowProps) => {
  const transcription = useAppStore((state) =>
    getRec(state.transcriptionById, id)
  );

  const handleCopyTranscript = useCallback(async (content: string) => {
    try {
      await navigator.clipboard.writeText(content);
    } catch (error) {
      showErrorSnackbar(error);
    }
  }, []);

  const handleDeleteTranscript = useCallback(async (id: string) => {
    try {
      produceAppState((draft) => {
        delete draft.transcriptionById[id];
        draft.transcriptions.transcriptionIds =
          draft.transcriptions.transcriptionIds.filter(
            (transcriptionId) => transcriptionId !== id
          );
      });
      await getTranscriptionRepo().deleteTranscription(id);
    } catch (error) {
      showErrorSnackbar(error);
    }
  }, []);

  return (
    <>
      <Stack
        direction="row"
        justifyContent="space-between"
        alignItems="center"
        mt={1.5}
        spacing={1}
      >
        <Typography variant="subtitle2" color="text.secondary">
          {dayjs(transcription?.createdAt.toDate()).format(
            "MMM D, YYYY h:mm A"
          )}
        </Typography>
        <Stack direction="row" spacing={1}>
          <IconButton
            aria-label="Copy transcript"
            onClick={() =>
              handleCopyTranscript(transcription?.transcript || "")
            }
            size="small"
          >
            <ContentCopyRoundedIcon fontSize="small" />
          </IconButton>
          <IconButton
            aria-label="Delete transcript"
            onClick={() => handleDeleteTranscript(id)}
            size="small"
          >
            <DeleteOutlineRoundedIcon fontSize="small" />
          </IconButton>
        </Stack>
      </Stack>
      <TypographyWithMore
        variant="body2"
        color="text.primary"
        maxLines={3}
        sx={{ mt: 1 }}
      >
        {transcription?.transcript}
      </TypographyWithMore>
      <Divider sx={{ mt: 2 }} />
    </>
  );
};
