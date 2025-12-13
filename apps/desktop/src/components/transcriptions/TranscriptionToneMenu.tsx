import { FormattedMessage } from "react-intl";
import { useMemo, useCallback } from "react";
import type { Tone } from "@repo/types";
import { getRec } from "@repo/utilities";
import { MenuPopoverBuilder } from "../common/MenuPopover";
import type {
  MenuPopoverItem,
  MenuPopoverBuilderArgs,
} from "../common/MenuPopover";
import { useAppStore } from "../../store";
import { getMyUserPreferences } from "../../utils/user.utils";

type TranscriptionToneMenuProps = {
  includeDefaultOption?: boolean;
  children: (args: MenuPopoverBuilderArgs) => React.ReactNode;
  onToneSelect: (toneId: string | null) => void;
};

const sortTones = (tones: Tone[]): Tone[] =>
  [...tones].sort((left, right) => left.sortOrder - right.sortOrder);

export const TranscriptionToneMenu = ({
  children,
  onToneSelect,
  includeDefaultOption = true,
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
    const menuItems: MenuPopoverItem[] = [];

    if (includeDefaultOption) {
      const defaultLabel = defaultTone ? (
        <FormattedMessage
          defaultMessage="Default ({toneName})"
          values={{ toneName: defaultTone.name }}
        />
      ) : (
        <FormattedMessage defaultMessage="Default" />
      );

      menuItems.push({
        kind: "listItem",
        title: defaultLabel,
        onClick: ({ close }) => {
          handleToneSelect(null);
          close();
        },
      });

      if (tones.length > 0) {
        menuItems.push({ kind: "divider" });
      }
    }

    menuItems.push(
      ...tones.map<MenuPopoverItem>((tone) => ({
        kind: "listItem",
        title: tone.name,
        onClick: ({ close }) => {
          handleToneSelect(tone.id);
          close();
        },
      })),
    );

    return menuItems;
  }, [defaultTone?.name, handleToneSelect, includeDefaultOption, tones]);

  return (
    <MenuPopoverBuilder
      items={items}
      sx={{ maxHeight: 300, overflowY: "auto" }}
    >
      {(args) => children(args)}
    </MenuPopoverBuilder>
  );
};
