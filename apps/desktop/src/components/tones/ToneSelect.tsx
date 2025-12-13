import { Add, Edit } from "@mui/icons-material";
import {
  FormControl,
  IconButton,
  InputLabel,
  MenuItem,
  Select,
  SelectChangeEvent,
  Stack,
  type SxProps,
  type Theme,
} from "@mui/material";
import type { Tone } from "@repo/types";
import { getRec } from "@repo/utilities";
import { useCallback, useMemo, useState } from "react";
import { FormattedMessage } from "react-intl";
import { openToneEditorDialog } from "../../actions/tone.actions";
import { useAppStore } from "../../store";
import { getMyUserPreferences } from "../../utils/user.utils";

const ADD_TONE_MENU_VALUE = "__add_tone_option__";

type ToneSelectProps = {
  value: string | null | undefined;
  onToneChange: (toneId: string | null) => void;
  addToneTargetId?: string | null;
  includeDefaultOption?: boolean;
  disabled?: boolean;
  formControlSx?: SxProps<Theme>;
  selectSize?: "small" | "medium";
  label?: string;
  trueDefault?: boolean;
};

const sortTones = (tones: Tone[]) =>
  [...tones].sort((left, right) => left.sortOrder - right.sortOrder);

export const ToneSelect = ({
  value,
  onToneChange,
  addToneTargetId = null,
  includeDefaultOption = true,
  disabled = false,
  formControlSx,
  selectSize = "small",
  label,
  trueDefault,
}: ToneSelectProps) => {
  const toneById = useAppStore((state) => state.toneById);
  const defaultTone = useAppStore((state) => {
    const userPreferences = getMyUserPreferences(state);
    return getRec(state.toneById, userPreferences?.activeToneId);
  });

  const tones = useMemo(() => sortTones(Object.values(toneById)), [toneById]);

  const [menuOpen, setMenuOpen] = useState(false);

  const handleToneChange = useCallback(
    (event: SelectChangeEvent<string>) => {
      if (event.target.value === ADD_TONE_MENU_VALUE) {
        setMenuOpen(false);
        openToneEditorDialog({ mode: "create", targetId: addToneTargetId });
        return;
      }

      const toneId = event.target.value === "" ? null : event.target.value;
      onToneChange(toneId);
    },
    [addToneTargetId, onToneChange],
  );

  const handleSelectOpen = useCallback(() => setMenuOpen(true), []);
  const handleSelectClose = useCallback(() => setMenuOpen(false), []);

  const resolvedValue = getRec(toneById, value)?.id ?? "";

  return (
    <FormControl size={selectSize} sx={formControlSx}>
      {label && <InputLabel shrink>{label}</InputLabel>}
      <Select
        open={menuOpen}
        onOpen={handleSelectOpen}
        onClose={handleSelectClose}
        value={resolvedValue}
        displayEmpty
        onChange={handleToneChange}
        size={selectSize}
        disabled={disabled}
        label={label}
        renderValue={(selected) => {
          if (!selected) {
            return defaultTone && !trueDefault ? (
              <FormattedMessage
                defaultMessage="Default ({toneName})"
                values={{ toneName: defaultTone.name }}
              />
            ) : (
              <FormattedMessage defaultMessage="Default" />
            );
          }

          return toneById[selected]?.name ?? selected;
        }}
      >
        <MenuItem value={ADD_TONE_MENU_VALUE}>
          <Stack direction="row" alignItems="center" spacing={1}>
            <Add fontSize="small" />
            <div>
              <FormattedMessage defaultMessage="New style" />
            </div>
          </Stack>
        </MenuItem>
        {includeDefaultOption && (
          <MenuItem value="">
            {defaultTone && !trueDefault ? (
              <FormattedMessage
                defaultMessage="Default ({toneName})"
                values={{ toneName: defaultTone.name }}
              />
            ) : (
              <FormattedMessage defaultMessage="Default" />
            )}
          </MenuItem>
        )}
        {tones.map((tone) => (
          <MenuItem key={tone.id} value={tone.id}>
            <Stack
              direction="row"
              alignItems="center"
              justifyContent="space-between"
              width="100%"
            >
              <div>{tone.name}</div>
              {!tone.isSystem && (
                <IconButton
                  size="small"
                  onClick={(event) => {
                    event.stopPropagation();
                    event.preventDefault();
                    setMenuOpen(false);
                    openToneEditorDialog({ mode: "edit", toneId: tone.id });
                  }}
                >
                  <Edit fontSize="small" />
                </IconButton>
              )}
            </Stack>
          </MenuItem>
        ))}
      </Select>
    </FormControl>
  );
};
