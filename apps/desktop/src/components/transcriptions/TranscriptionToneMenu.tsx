import type { Tone } from "@repo/types";
import { getRec } from "@repo/utilities";
import { useCallback, useMemo } from "react";
import { useAppStore } from "../../store";
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

const sortTones = (tones: Tone[]): Tone[] =>
  [...tones].sort((left, right) => left.sortOrder - right.sortOrder);

export const TranscriptionToneMenu = ({
  children,
  onToneSelect,
}: TranscriptionToneMenuProps) => {
  const toneById = useAppStore((state) => state.toneById);
  const defaultTone = useAppStore((state) =>
    getRec(state.toneById, getMyUserPreferences(state)?.activeToneId),
  );

  const tones = useMemo(() => sortTones(Object.values(toneById)), [toneById]);

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
