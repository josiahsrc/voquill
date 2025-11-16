import { getRec } from "@repo/utilities";
import { useCallback } from "react";
import { setAppTargetTone } from "../../actions/app-target.actions";
import { useAppStore } from "../../store";
import { ListTile } from "../common/ListTile";
import { ToneSelect } from "../tones/ToneSelect";

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
      sx={{ backgroundColor: "level1", mb: 1, borderRadius: 1 }}
    />
  );
};
