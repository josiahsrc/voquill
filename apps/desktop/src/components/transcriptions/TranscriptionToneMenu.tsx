import type { Tone } from "@repo/types";
import { getRec } from "@repo/utilities";
import { useCallback, useMemo } from "react";
import { useAppStore } from "../../store";
import { getSortedToneIds } from "../../utils/tone.utils";
import { getMyUserPreferences } from "../../utils/user.utils";
import type {
  MenuPopoverBuilderArgs,
  MenuPopoverItem,
} from "../common/MenuPopover";
import { MenuPopoverBuilder } from "../common/MenuPopover";

type TranscriptionToneMenuProps = {
  children: (args: MenuPopoverBuilderArgs) => React.ReactNode;
  onToneSelect: (toneId: string | null) => void;
};

export const TranscriptionToneMenu = ({
  children,
  onToneSelect,
}: TranscriptionToneMenuProps) => {
  const defaultTone = useAppStore((state) =>
    getRec(state.toneById, getMyUserPreferences(state)?.activeToneId),
  );

  const tones = useAppStore((state) => {
    const toneIds = getSortedToneIds(state);
    return toneIds
      .map((toneId) => getRec(state.toneById, toneId))
      .filter((tone): tone is Tone => tone !== null);
  });

  const handleToneSelect = useCallback(
    (toneId: string | null) => {
      onToneSelect(toneId);
    },
    [onToneSelect],
  );

  const items = useMemo<MenuPopoverItem[]>(() => {
    const menuItems: MenuPopoverItem[] = tones.map<MenuPopoverItem>((tone) => ({
      kind: "listItem",
      title: tone.name,
      onClick: ({ close }) => {
        handleToneSelect(tone.id);
        close();
      },
    }));

    return menuItems;
  }, [defaultTone?.name, handleToneSelect, tones]);

  return (
    <MenuPopoverBuilder
      items={items}
      sx={{ maxHeight: 300, overflowY: "auto" }}
    >
      {(args) => children(args)}
    </MenuPopoverBuilder>
  );
};
