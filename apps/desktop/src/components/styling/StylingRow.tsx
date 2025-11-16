import { FormControl, MenuItem, Select, SelectChangeEvent } from "@mui/material";
import { FormattedMessage } from "react-intl";
import { useCallback, useMemo } from "react";
import { getRec } from "@repo/utilities";
import { setAppTargetTone } from "../../actions/app-target.actions";
import { useAppStore } from "../../store";
import { ListTile } from "../common/ListTile";

export type StylingRowProps = {
  id: string;
};

export const StylingRow = ({ id }: StylingRowProps) => {
  const target = useAppStore((state) => getRec(state.appTargetById, id));
  const toneById = useAppStore((state) => state.toneById);
  const tones = useMemo(
    () =>
      Object.values(toneById).sort(
        (left, right) => left.sortOrder - right.sortOrder,
      ),
    [toneById],
  );

  const handleToneChange = useCallback(
    (event: SelectChangeEvent<string>) => {
      if (!target) {
        return;
      }

      const toneId = event.target.value === "" ? null : event.target.value;
      void setAppTargetTone(target.id, toneId);
    },
    [target],
  );

  const toneValue = target?.toneId ?? "";

  return (
    <ListTile
      title={target?.name}
      disableRipple
      trailing={
        <FormControl size="small" sx={{ minWidth: 160 }}>
          <Select
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
            <MenuItem value="">
              <FormattedMessage defaultMessage="Default" />
            </MenuItem>
            {tones.map((tone) => (
              <MenuItem key={tone.id} value={tone.id}>
                {tone.name}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      }
    />
  );
};
