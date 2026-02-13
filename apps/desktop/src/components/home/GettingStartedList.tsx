import {
  CheckCircleRounded,
  InfoOutlined,
  RadioButtonUncheckedRounded,
} from "@mui/icons-material";
import {
  Box,
  LinearProgress,
  Stack,
  Tooltip,
  Typography,
} from "@mui/material";
import { useMemo } from "react";
import { FormattedMessage, useIntl } from "react-intl";
import { useLocalStorage } from "../../hooks/local-storage.hooks";
import { useAppStore } from "../../store";
import { StorageImage } from "../common/StorageImage";

type ChecklistItem = {
  label: string;
  info: string;
  done: boolean;
  extra?: React.ReactNode;
};

function ChecklistRow({ item }: { item: ChecklistItem }) {
  return (
    <Stack
      direction="row"
      alignItems="center"
      spacing={1.5}
      sx={{
        py: 1.25,
        px: 0.5,
        borderRadius: 1,
        "&:hover": { bgcolor: "var(--app-palette-level1)" },
        transition: "background-color 0.15s",
      }}
    >
      {item.done ? (
        <CheckCircleRounded
          sx={{ color: "var(--app-palette-blue)", fontSize: 22 }}
        />
      ) : (
        <RadioButtonUncheckedRounded
          sx={{ color: "text.disabled", fontSize: 22 }}
        />
      )}
      <Typography
        variant="body1"
        sx={{
          textDecoration: item.done ? "line-through" : "none",
          color: item.done ? "text.secondary" : "text.primary",
        }}
      >
        {item.label}
      </Typography>
      {item.extra}
      <Box sx={{ flex: 1 }} />
      <Tooltip title={item.info} arrow>
        <InfoOutlined
          sx={{ fontSize: 16, color: "text.disabled", cursor: "help" }}
        />
      </Tooltip>
    </Stack>
  );
}

function AppIconBoxes({ iconPaths }: { iconPaths: (string | null)[] }) {
  const slots = [iconPaths[0] ?? null, iconPaths[1] ?? null, iconPaths[2] ?? null];

  return (
    <Stack direction="row" spacing={0.75}>
      {slots.map((path, i) => (
        <Box
          key={i}
          sx={{
            overflow: "hidden",
            borderRadius: 0.75,
            minWidth: 36,
            minHeight: 36,
            maxWidth: 36,
            maxHeight: 36,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            bgcolor: "level2",
            border: path ? "1.5px solid var(--app-palette-blue)" : "none",
          }}
        >
          {path && <StorageImage path={path} size={36} />}
        </Box>
      ))}
    </Stack>
  );
}

export function GettingStartedList() {
  const intl = useIntl();
  const [isDismissed, setDismissed] = useLocalStorage("voquill:checklist-dismissed", false);
  const [hasAddedDictionaryWord] = useLocalStorage("voquill:checklist-dictionary", false);
  const [hasSelectedWritingStyle] = useLocalStorage("voquill:checklist-writing-style", false);
  const appTargetById = useAppStore((state) => state.appTargetById);

  const appTargetEntries = useMemo(
    () => Object.values(appTargetById),
    [appTargetById],
  );
  const appCount = appTargetEntries.length;
  const appsComplete = appCount >= 3;

  const iconPaths = useMemo(
    () => appTargetEntries.slice(0, 3).map((t) => t.iconPath ?? null),
    [appTargetEntries],
  );

  const checklist: ChecklistItem[] = [
    {
      label: intl.formatMessage({
        defaultMessage: "Use Voquill in 3 different apps",
      }),
      info: intl.formatMessage({
        defaultMessage:
          "Dictate text into 3 different applications. Voquill will detect each app automatically.",
      }),
      done: appsComplete,
      extra: <AppIconBoxes iconPaths={iconPaths} />,
    },
    {
      label: intl.formatMessage({
        defaultMessage: "Select a different writing style",
      }),
      info: intl.formatMessage({
        defaultMessage:
          "Go to the Styles page and choose a writing style to change how your dictation sounds.",
      }),
      done: hasSelectedWritingStyle,
    },
    {
      label: intl.formatMessage({
        defaultMessage: "Add a word to your dictionary",
      }),
      info: intl.formatMessage({
        defaultMessage:
          "Open the Dictionary page and add a glossary term or replacement rule.",
      }),
      done: hasAddedDictionaryWord,
    },
  ];

  const completedCount = checklist.filter((i) => i.done).length;
  const progress = (completedCount / checklist.length) * 100;
  const allDone = completedCount === checklist.length;

  if (isDismissed || allDone) {
    return null;
  }

  return (
    <Box>
      <Stack
        direction="row"
        justifyContent="space-between"
        alignItems="center"
        sx={{ mb: 1 }}
      >
        <Stack direction="row" alignItems="baseline" spacing={1}>
          <Typography variant="h6" fontWeight={600}>
            <FormattedMessage defaultMessage="Getting started" />
          </Typography>
          <Typography
            variant="caption"
            color="text.secondary"
            sx={{ cursor: "pointer", "&:hover": { textDecoration: "underline" } }}
            onClick={() => setDismissed(true)}
          >
            <FormattedMessage defaultMessage="Skip" />
          </Typography>
        </Stack>
        <Typography variant="body2" color="text.secondary">
          <FormattedMessage
            defaultMessage="{completed} of {total}"
            values={{ completed: completedCount, total: checklist.length }}
          />
        </Typography>
      </Stack>
      <LinearProgress
        variant="determinate"
        value={progress}
        sx={{
          height: 6,
          borderRadius: 3,
          bgcolor: "var(--app-palette-level2)",
          mb: 1,
          "& .MuiLinearProgress-bar": {
            bgcolor: "var(--app-palette-blue)",
            borderRadius: 3,
          },
        }}
      />
      <Stack spacing={0}>
        {checklist.map((item) => (
          <ChecklistRow key={item.label} item={item} />
        ))}
      </Stack>
    </Box>
  );
}
