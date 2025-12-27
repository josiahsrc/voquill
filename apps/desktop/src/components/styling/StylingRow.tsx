import { getRec } from "@repo/utilities";
import { useCallback } from "react";
import {
  setAppTargetPasteKeybind,
  setAppTargetTone,
} from "../../actions/app-target.actions";
import { useAppStore } from "../../store";
import { ListTile } from "../common/ListTile";
import { StorageImage } from "../common/StorageImage";
import { ToneSelect } from "../tones/ToneSelect";
import {
  Box,
  FormControl,
  MenuItem,
  Select,
  SelectChangeEvent,
  Stack,
} from "@mui/material";

export type StylingRowProps = {
  id: string;
};

const PASTE_KEYBIND_OPTIONS = [
  { value: "ctrl+v", label: "Default (Ctrl+V)" },
  { value: "ctrl+shift+v", label: "Terminal (Ctrl+Shift+V)" },
] as const;

export const StylingRow = ({ id }: StylingRowProps) => {
  const target = useAppStore((state) => getRec(state.appTargetById, id));

  const handleToneChange = useCallback(
    (toneId: string | null) => {
      if (!target) {
        return;
      }

      void setAppTargetTone(target.id, toneId);
    },
    [target],
  );

  const handlePasteKeybindChange = useCallback(
    (event: SelectChangeEvent<string>) => {
      if (!target) {
        return;
      }

      const value = event.target.value;
      // Store null for default (ctrl+v) to keep database cleaner
      void setAppTargetPasteKeybind(
        target.id,
        value === "ctrl+v" ? null : value,
      );
    },
    [target],
  );

  const toneValue = target?.toneId ?? null;
  const pasteKeybindValue = target?.pasteKeybind ?? "ctrl+v";

  const leading = (
    <Box
      sx={{
        overflow: "hidden",
        borderRadius: 0.75,
        minWidth: 36,
        minHeight: 36,
        maxWidth: 36,
        maxHeight: 36,
        bgcolor: "level2",
        mr: 1,
      }}
    >
      {target?.iconPath && (
        <StorageImage
          path={target.iconPath}
          alt={target?.name ?? "App icon"}
          size={36}
        />
      )}
    </Box>
  );

  const trailing = (
    <Stack direction="row" spacing={1}>
      <ToneSelect
        value={toneValue}
        onToneChange={handleToneChange}
        addToneTargetId={target?.id ?? null}
        disabled={!target}
        formControlSx={{ minWidth: 140 }}
      />
      <FormControl size="small" sx={{ minWidth: 180 }}>
        <Select
          value={pasteKeybindValue}
          onChange={handlePasteKeybindChange}
          disabled={!target}
        >
          {PASTE_KEYBIND_OPTIONS.map((option) => (
            <MenuItem key={option.value} value={option.value}>
              {option.label}
            </MenuItem>
          ))}
        </Select>
      </FormControl>
    </Stack>
  );

  return (
    <ListTile
      title={target?.name}
      disableRipple
      trailing={trailing}
      leading={leading}
      sx={{ backgroundColor: "level1", mb: 1, borderRadius: 1 }}
    />
  );
};
