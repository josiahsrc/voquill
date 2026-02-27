import ContentCopyRoundedIcon from "@mui/icons-material/ContentCopyRounded";
import DeleteOutlineRoundedIcon from "@mui/icons-material/DeleteOutlineRounded";
import FileDownloadOutlinedIcon from "@mui/icons-material/FileDownloadOutlined";
import FlagOutlinedIcon from "@mui/icons-material/FlagOutlined";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import ReplayRoundedIcon from "@mui/icons-material/ReplayRounded";
import { Divider, IconButton, Stack, Tooltip, Typography } from "@mui/material";
import { getRec } from "@repo/utilities";
import { invoke } from "@tauri-apps/api/core";
import dayjs from "dayjs";
import { useCallback, useMemo } from "react";
import { useIntl } from "react-intl";
import { showErrorSnackbar, showSnackbar } from "../../actions/app.actions";
import {
  openFlagTranscriptionDialog,
  openRetranscribeDialog,
  openTranscriptionDetailsDialog,
} from "../../actions/transcriptions.actions";
import { getTranscriptionRepo } from "../../repos";
import { produceAppState, useAppStore } from "../../store";
import { getIsVoquillCloudUser } from "../../utils/member.utils";
import { TypographyWithMore } from "../common/TypographyWithMore";
import { AudioPlayerPill } from "./AudioPlayerPill";

export type TranscriptionRowProps = {
  id: string;
};

export const TranscriptionRow = ({ id }: TranscriptionRowProps) => {
  const intl = useIntl();
  const isCloudUser = useAppStore(getIsVoquillCloudUser);
  const transcription = useAppStore((state) =>
    getRec(state.transcriptionById, id),
  );

  const hasMetadata = useMemo(() => {
    const model = transcription?.modelSize?.trim();
    const device = transcription?.inferenceDevice?.trim();
    return Boolean(model || device);
  }, [transcription?.inferenceDevice, transcription?.modelSize]);

  const isRetranscribing = useAppStore((state) =>
    state.transcriptions.retranscribingIds.includes(id),
  );

  const audioSnapshot = transcription?.audio;

  const handleDetailsOpen = useCallback(() => {
    openTranscriptionDetailsDialog(id);
  }, [id]);

  const handleCopyTranscript = useCallback(
    async (content: string) => {
      try {
        await navigator.clipboard.writeText(content);
        showSnackbar(
          intl.formatMessage({ defaultMessage: "Copied successfully" }),
          { mode: "success" },
        );
      } catch (error) {
        showErrorSnackbar(error);
      }
    },
    [intl],
  );

  const handleDeleteTranscript = useCallback(
    async (id: string) => {
      try {
        produceAppState((draft) => {
          delete draft.transcriptionById[id];
          draft.transcriptions.transcriptionIds =
            draft.transcriptions.transcriptionIds.filter(
              (transcriptionId) => transcriptionId !== id,
            );
        });
        await getTranscriptionRepo().deleteTranscription(id);
        showSnackbar(
          intl.formatMessage({ defaultMessage: "Delete successful" }),
          { mode: "success" },
        );
      } catch (error) {
        showErrorSnackbar(error);
      }
    },
    [intl],
  );

  const handleExport = useCallback(async () => {
    try {
      const saved = await invoke<boolean>("export_transcription", { id });
      if (saved) {
        showSnackbar(
          intl.formatMessage({ defaultMessage: "Export saved successfully" }),
          { mode: "success" },
        );
      }
    } catch (error) {
      showErrorSnackbar(error);
    }
  }, [id, intl]);

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
          {dayjs(transcription?.createdAt).format("MMM D, YYYY h:mm A")}
        </Typography>
        <Stack direction="row" spacing={1}>
          <Tooltip
            title={intl.formatMessage({
              defaultMessage: "View transcription details",
            })}
            placement="top"
          >
            <IconButton
              aria-label={intl.formatMessage({
                defaultMessage: "View transcription details",
              })}
              onClick={handleDetailsOpen}
              size="small"
              color={hasMetadata ? "primary" : "default"}
            >
              <InfoOutlinedIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip
            title={intl.formatMessage({ defaultMessage: "Copy transcript" })}
            placement="top"
          >
            <IconButton
              aria-label={intl.formatMessage({
                defaultMessage: "Copy transcript",
              })}
              onClick={() =>
                handleCopyTranscript(transcription?.transcript || "")
              }
              size="small"
            >
              <ContentCopyRoundedIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip
            title={intl.formatMessage({ defaultMessage: "Delete transcript" })}
            placement="top"
          >
            <IconButton
              aria-label={intl.formatMessage({
                defaultMessage: "Delete transcript",
              })}
              onClick={() => handleDeleteTranscript(id)}
              size="small"
            >
              <DeleteOutlineRoundedIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Stack>
      </Stack>
      <TypographyWithMore
        variant="body2"
        color="text.primary"
        maxLines={3}
        sx={{ my: 1 }}
      >
        {transcription?.transcript}
      </TypographyWithMore>
      {audioSnapshot && (
        <AudioPlayerPill
          transcriptionId={id}
          durationMs={audioSnapshot.durationMs}
          disabled={isRetranscribing}
          actions={
            <>
              <Tooltip
                title={intl.formatMessage({
                  defaultMessage: "Retranscribe audio clip",
                })}
                placement="top"
              >
                <IconButton
                  aria-label={intl.formatMessage({
                    defaultMessage: "Retranscribe audio",
                  })}
                  size="small"
                  onClick={() => openRetranscribeDialog(id)}
                  disabled={isRetranscribing}
                  sx={{ p: 0.5 }}
                >
                  <ReplayRoundedIcon fontSize="small" />
                </IconButton>
              </Tooltip>
              <Tooltip
                title={intl.formatMessage({
                  defaultMessage: "Export transcription",
                })}
                placement="top"
              >
                <IconButton
                  aria-label={intl.formatMessage({
                    defaultMessage: "Export transcription",
                  })}
                  size="small"
                  onClick={handleExport}
                  sx={{ p: 0.5 }}
                >
                  <FileDownloadOutlinedIcon fontSize="small" />
                </IconButton>
              </Tooltip>
              {isCloudUser && (
                <Tooltip
                  title={intl.formatMessage({
                    defaultMessage: "Report a problem with this transcription",
                  })}
                  placement="top"
                >
                  <IconButton
                    aria-label={intl.formatMessage({
                      defaultMessage:
                        "Report a problem with this transcription",
                    })}
                    size="small"
                    onClick={() => openFlagTranscriptionDialog(id)}
                    sx={{ p: 0.5 }}
                  >
                    <FlagOutlinedIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              )}
            </>
          }
        />
      )}
      <Divider sx={{ mt: 2 }} />
    </>
  );
};
