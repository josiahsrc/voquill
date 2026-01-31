import {
  Box,
  Divider,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Popover,
  type PopoverOrigin,
  Stack,
  type SxProps,
} from "@mui/material";
import { useState } from "react";

export type MenuPopoverCallbackArgs = {
  close: () => void;
  event: React.MouseEvent<HTMLElement>;
};

export type MenuPopoverListItem = {
  kind: "listItem";
  title?: React.ReactNode;
  leading?: React.ReactNode;
  onClick?: (args: MenuPopoverCallbackArgs) => void;
};

export type MenuPopoverDivider = {
  kind: "divider";
};

export type MenuPopoverItem = MenuPopoverListItem | MenuPopoverDivider;

type MenuPopoverItemRendProps = {
  item: MenuPopoverItem;
  close: () => void;
};

const MenuPopoverItemRend = ({ item, close }: MenuPopoverItemRendProps) => {
  if (item.kind === "divider") {
    return <Divider />;
  }

  return (
    <ListItemButton
      onClick={(e) => item.onClick?.({ close, event: e })}
    >
      {item.leading && (
        <ListItemIcon sx={{ minWidth: 36 }}>{item.leading}</ListItemIcon>
      )}
      <ListItemText primary={item.title} />
    </ListItemButton>
  );
};

type MenuPopoverProps = {
  open: boolean;
  anchorEl?: HTMLElement | null;
  onClose: () => void;
  items: MenuPopoverItem[];
  sx?: SxProps;
  anchorOrigin?: PopoverOrigin;
  transformOrigin?: PopoverOrigin;
};

export const MenuPopover = ({
  open,
  anchorEl,
  onClose,
  items,
  sx,
  anchorOrigin,
  transformOrigin,
}: MenuPopoverProps) => {
  return (
    <Popover
      open={open}
      anchorEl={anchorEl}
      onClose={onClose}
      anchorOrigin={
        anchorOrigin ?? { vertical: "bottom", horizontal: "right" }
      }
      transformOrigin={
        transformOrigin ?? { vertical: "top", horizontal: "right" }
      }
    >
      <Stack sx={sx}>
        {items.map((item, index) => (
          <Box key={index}>
            <MenuPopoverItemRend item={item} close={onClose} />
          </Box>
        ))}
      </Stack>
    </Popover>
  );
};

export type MenuPopoverBuilderArgs = {
  ref: React.RefCallback<HTMLElement | null>;
  isOpen: boolean;
  open: () => void;
  close: () => void;
};

export type MenuPopoverBuilderProps = {
  items: MenuPopoverItem[];
  sx?: SxProps;
  anchorOrigin?: PopoverOrigin;
  transformOrigin?: PopoverOrigin;
  children?: (args: MenuPopoverBuilderArgs) => React.ReactNode;
};

export const MenuPopoverBuilder = ({
  children,
  items,
  ...rest
}: MenuPopoverBuilderProps) => {
  const [ref, setRef] = useState<HTMLElement | null>(null);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const isOpen = Boolean(anchorEl);

  const handleOpen = () => setAnchorEl(ref);
  const handleClose = () => setAnchorEl(null);

  return (
    <>
      {children?.({
        ref: setRef,
        open: handleOpen,
        isOpen,
        close: handleClose,
      })}
      <MenuPopover
        open={isOpen}
        anchorEl={anchorEl}
        onClose={handleClose}
        items={items}
        {...rest}
      />
    </>
  );
};
