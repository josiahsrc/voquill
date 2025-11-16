import { Add, Edit } from "@mui/icons-material";
import {
  FormControl,
  IconButton,
  MenuItem,
  Select,
  SelectChangeEvent,
  Stack,
  Typography,
} from "@mui/material";
import { getRec } from "@repo/utilities";
import { useCallback, useMemo, useState } from "react";
import { FormattedMessage } from "react-intl";
import { setAppTargetTone } from "../../actions/app-target.actions";
import { openToneEditorDialog } from "../../actions/tone.actions";
import { useAppStore } from "../../store";
import { ListTile } from "../common/ListTile";

const ADD_TONE_MENU_VALUE = "__add_tone_option__";

export type StylingRowProps = {
  id: string;
};

export const StylingRow = ({ id }: StylingRowProps) => {
  const target = useAppStore((state) => getRec(state.appTargetById, id));
  const toneById = useAppStore((state) => state.toneById);
  const tones = useMemo(
    () =>
      Object.values(toneById).sort(
        (left, right) => left.sortOrder - right.sortOrder
      ),
    [toneById]
  );

  const [menuOpen, setMenuOpen] = useState(false);

  const handleToneChange = useCallback(
    (event: SelectChangeEvent<string>) => {
      if (!target) {
        return;
      }

      if (event.target.value === ADD_TONE_MENU_VALUE) {
        setMenuOpen(false);
        openToneEditorDialog({ mode: "create", targetId: target?.id ?? null });
        return;
      }

      const toneId = event.target.value === "" ? null : event.target.value;
      void setAppTargetTone(target.id, toneId);
    },
    [target]
  );

  const handleSelectOpen = useCallback(() => setMenuOpen(true), []);
  const handleSelectClose = useCallback(() => setMenuOpen(false), []);

  const toneValue = target?.toneId ?? "";

  const select = (
    <FormControl size="small" sx={{ minWidth: 160 }}>
      <Select
        open={menuOpen}
        onOpen={handleSelectOpen}
        onClose={handleSelectClose}
        value={toneValue}
        displayEmpty
        onChange={handleToneChange}
        size="small"
        disabled={!target}
        renderValue={(selected) => {
          if (!selected) {
            return <FormattedMessage defaultMessage="Default" />;
          }

          return toneById[selected]?.name ?? selected;
        }}
      >
        <MenuItem value={ADD_TONE_MENU_VALUE}>
          <Stack direction="row" alignItems="center" spacing={1}>
            <Add fontSize="small" />
            <Typography variant="body2" fontWeight={500}>
              <FormattedMessage defaultMessage="New style" />
            </Typography>
          </Stack>
        </MenuItem>
        <MenuItem value="">
          <FormattedMessage defaultMessage="Default" />
        </MenuItem>
        {tones.map((tone) => (
          <MenuItem key={tone.id} value={tone.id}>
            <Stack
              direction="row"
              alignItems="center"
              justifyContent="space-between"
              width="100%"
            >
              <Typography
                variant="body2"
                sx={{
                  flex: 1,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {tone.name}
              </Typography>
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
            </Stack>
          </MenuItem>
        ))}
      </Select>
    </FormControl>
  );

  return (
    <ListTile
      title={target?.name}
      disableRipple
      trailing={select}
      sx={{ backgroundColor: "level1", mb: 1, borderRadius: 1 }}
    />
  );
};
