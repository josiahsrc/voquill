import { useEffect, useMemo, useState } from "react";
import { Chip, Paper, Stack, TextField, Typography } from "@mui/material";
import { Section } from "./Section";
import { Stat } from "./Stat";
import { useRecordingTelemetry } from "../../hooks/useRecordingTelemetry";
import { formatDuration, formatSize } from "../../utils/format.utils";

const NAME_STORAGE_KEY = "voquill.dashboard.name";
const BIO_STORAGE_KEY = "voquill.dashboard.bio";

const isBrowser = () => typeof window !== "undefined";

export const DashboardHome = () => {
  const { recordingState, altPressCount } = useRecordingTelemetry();
  const [name, setName] = useState("");
  const [bio, setBio] = useState("");

  useEffect(() => {
    if (!isBrowser()) {
      return;
    }
    const storedName = window.localStorage.getItem(NAME_STORAGE_KEY);
    const storedBio = window.localStorage.getItem(BIO_STORAGE_KEY);
    if (storedName) {
      setName(storedName);
    }
    if (storedBio) {
      setBio(storedBio);
    }
  }, []);

  const handleBlurName = () => {
    const trimmed = name.trim();
    if (!isBrowser()) {
      return;
    }

    if (trimmed) {
      window.localStorage.setItem(NAME_STORAGE_KEY, trimmed);
    } else {
      window.localStorage.removeItem(NAME_STORAGE_KEY);
      setName("");
    }
  };

  const handleBlurBio = () => {
    if (!isBrowser()) {
      return;
    }
    const trimmed = bio.trim();
    if (trimmed) {
      window.localStorage.setItem(BIO_STORAGE_KEY, trimmed);
    } else {
      window.localStorage.removeItem(BIO_STORAGE_KEY);
      setBio("");
    }
  };

  const welcomeName = useMemo(() => {
    const trimmed = name.trim();
    if (trimmed) {
      return trimmed.split(" ")[0];
    }
    return "there";
  }, [name]);

  const stats = (
    <Stack
      direction={{ xs: "column", sm: "row" }}
      spacing={2}
      sx={{ mb: 4 }}
    >
      <Paper sx={{ flex: 1, p: 3 }}>
        <Stat label="Alt key triggers" value={altPressCount} />
      </Paper>
      <Paper sx={{ flex: 1, p: 3 }}>
        <Stat
          label="Last recording duration"
          value={
            recordingState.lastDurationMs
              ? formatDuration(recordingState.lastDurationMs)
              : "Waiting"
          }
        />
      </Paper>
      <Paper sx={{ flex: 1, p: 3 }}>
        <Stat
          label="Last recording size"
          value={
            recordingState.lastSizeBytes
              ? formatSize(recordingState.lastSizeBytes)
              : "Waiting"
          }
        />
      </Paper>
    </Stack>
  );

  const planChip = (
    <Chip
      label={recordingState.isRecording ? "Live recording" : "Idle"}
      color={recordingState.isRecording ? "primary" : "default"}
      variant={recordingState.isRecording ? "filled" : "outlined"}
      sx={{
        fontWeight: 600,
        backgroundColor: recordingState.isRecording
          ? (theme) => theme.palette.goldBg
          : undefined,
        color: recordingState.isRecording
          ? (theme) => theme.palette.goldFg
          : "inherit",
        borderColor: recordingState.isRecording
          ? (theme) => theme.palette.goldFg
          : undefined,
      }}
    />
  );

  return (
    <Stack spacing={3}>
      <Stack spacing={1}>
        <Typography variant="h4" fontWeight={700}>
          Welcome, {welcomeName}
        </Typography>
        {planChip}
      </Stack>

      <Paper
        sx={{
          p: 3,
          background:
            "linear-gradient(135deg, rgba(255, 193, 7, 0.2), rgba(104, 48, 9, 0.05))",
        }}
      >
        <Typography variant="h6" fontWeight={700} sx={{ mb: 1 }}>
          Quick tip
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Access the original workflow anytime from the Legacy tab in the sidebar.
          Your recording shortcuts and telemetry continue to work exactly the same.
        </Typography>
      </Paper>

      {stats}

      <Section
        title="About you"
        description="Personalize how Voquill greets you and references your details in the desktop experience."
      >
        <Stack spacing={3}>
          <TextField
            label="Your name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            onBlur={handleBlurName}
            placeholder="Enter your name"
            variant="outlined"
          />
          <TextField
            label="Short bio"
            value={bio}
            onChange={(event) => setBio(event.target.value)}
            onBlur={handleBlurBio}
            placeholder="Tell us a little about yourself"
            variant="outlined"
            multiline
            minRows={3}
          />
        </Stack>
      </Section>

      <Paper sx={{ p: 3 }}>
        <Typography variant="h6" fontWeight={700} sx={{ mb: 1 }}>
          Recent transcription
        </Typography>
        {recordingState.lastTranscription ? (
          <Typography variant="body1">
            {recordingState.lastTranscription}
          </Typography>
        ) : (
          <Typography variant="body2" color="text.secondary">
            Trigger a recording to see the captured transcript here.
          </Typography>
        )}
      </Paper>
    </Stack>
  );
};
