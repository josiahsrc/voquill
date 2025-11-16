import { getRec } from "@repo/utilities";
import { useCallback } from "react";
import { setAppTargetTone } from "../../actions/app-target.actions";
import { useAppStore } from "../../store";
import { ListTile } from "../common/ListTile";
import { StorageImage } from "../common/StorageImage";
import { ToneSelect } from "../tones/ToneSelect";
import { Box } from "@mui/material";

export type StylingRowProps = {
  id: string;
};

export const StylingRow = ({ id }: StylingRowProps) => {
  const target = useAppStore((state) => getRec(state.appTargetById, id));

  const handleToneChange = useCallback(
    (toneId: string | null) => {
      if (!target) {
        return;
      }

      void setAppTargetTone(target.id, toneId);
    },
    [target]
  );
  const toneValue = target?.toneId ?? null;
  const leading = (
    <Box
      sx={{
        overflow: "hidden",
        borderRadius: 0.7,
        minWidth: 36,
        minHeight: 36,
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

  const select = (
    <ToneSelect
      value={toneValue}
      onToneChange={handleToneChange}
      addToneTargetId={target?.id ?? null}
      disabled={!target}
      formControlSx={{ minWidth: 160 }}
    />
  );

  return (
    <ListTile
      title={target?.name}
      disableRipple
      trailing={select}
      leading={leading}
      sx={{ backgroundColor: "level1", mb: 1, borderRadius: 1 }}
    />
  );
};
