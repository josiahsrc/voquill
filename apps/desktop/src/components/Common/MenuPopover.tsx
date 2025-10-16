import {
  Box,
  Divider,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Popover,
  type PopoverOrigin,
  type PopoverPosition,
  type PopoverReference,
  Stack,
  type SxProps,
} from "@mui/material";
import { useRef, useState } from "react";
import { ListTile } from "./ListTile";

export type MenuPopoverCallbackArgs = {
  close: () => void;
  event: React.MouseEvent<HTMLElement>;
};

export type MenuPopoverListItem = {
  kind: "listItem";
  title?: React.ReactNode;
  leading?: React.ReactNode;
  trailing?: React.ReactNode;
  onClick?: (args: MenuPopoverCallbackArgs) => void;
};

export type MenuPopoverDivider = {
  kind: "divider";
};

export type MenuPopoverGenericItem = {
  kind: "genericItem";
  builder: (args: { close: () => void }) => React.ReactNode;
};

export type MenuPopoverSubMenu = {
  kind: "subMenu";
  title?: React.ReactNode;
  leading?: React.ReactNode;
  trailing?: React.ReactNode;
  children: MenuPopoverItem[];
};

export type MenuPopoverItem =
  | MenuPopoverListItem
  | MenuPopoverDivider
  | MenuPopoverGenericItem
  | MenuPopoverSubMenu;

type MenuPopoverItemRendProps = {
  item: MenuPopoverItem;
  close: () => void;
};

type MenuPopoverSubMenuItemProps = {
  item: MenuPopoverSubMenu;
  close: () => void;
};

const MenuPopoverSubMenuItem = ({
  item,
  close,
}: MenuPopoverSubMenuItemProps) => {
  const [submenuOpen, setSubmenuOpen] = useState(false);
  const [coords, setCoords] = useState({ top: 0, left: 0 });
  const buttonRef = useRef<HTMLDivElement>(null);
  const hideTimerRef = useRef<number | null>(null);

  const openSubmenu = (): void => {
    if (hideTimerRef.current) {
      window.clearTimeout(hideTimerRef.current);
      hideTimerRef.current = null;
    }
    if (buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      setCoords({ top: rect.top, left: rect.right });
    }
    setSubmenuOpen(true);
  };

  const closeSubmenu = (): void => {
    setSubmenuOpen(false);
  };

  return (
    <>
      <div
        ref={buttonRef}
        onMouseEnter={openSubmenu}
        onMouseLeave={closeSubmenu}
      >
        <ListItemButton>
          {item.leading && <ListItemIcon>{item.leading}</ListItemIcon>}
          <ListItemText primary={item.title} />
          {item.trailing}
        </ListItemButton>
      </div>
      {submenuOpen && (
        <Box
          onMouseEnter={openSubmenu}
          onMouseLeave={closeSubmenu}
          sx={{
            position: "fixed",
            top: coords.top,
            left: coords.left,
            zIndex: 1300,
            backgroundColor: "background.paper",
            overflow: "hidden",
            borderRadius: (t) => t.shape.borderRadius,
          }}
        >
          <Stack>
            {item.children.map((child, index) => (
              <Box key={index} role="menuitem">
                <MenuPopoverItemRend item={child} close={close} />
              </Box>
            ))}
          </Stack>
        </Box>
      )}
    </>
  );
};

const MenuPopoverItemRend = ({
  item,
  close,
}: MenuPopoverItemRendProps): React.ReactNode => {
  if (item.kind === "listItem") {
    return (
      <ListTile
        leading={item.leading}
        title={item.title}
        trailing={item.trailing}
        onClick={(e) => item.onClick && item.onClick({ close, event: e })}
      />
    );
  }

  if (item.kind === "divider") {
    return <Divider />;
  }

  if (item.kind === "genericItem") {
    return item.builder({ close });
  }

  if (item.kind === "subMenu") {
    return <MenuPopoverSubMenuItem item={item} close={close} />;
  }

  return null;
};

type MenuPopoverProps = {
  open: boolean;
  anchorEl?: HTMLElement | null;
  onClose: () => void;
  items: MenuPopoverItem[];
  sx?: SxProps;
  anchorOrigin?: PopoverOrigin;
  transformOrigin?: PopoverOrigin;
  anchorReference?: PopoverReference;
  anchorPosition?: PopoverPosition;
};

type SharedProps = Omit<MenuPopoverProps, "open" | "anchorEl" | "onClose">;

export const MenuPopover = ({
  open,
  anchorEl,
  onClose,
  items,
  sx,
  anchorOrigin,
  transformOrigin,
  ...rest
}: MenuPopoverProps) => {
  const handleClose = (event: React.MouseEvent<HTMLElement>): void => {
    event.stopPropagation();
    onClose?.();
  };

  const stopPropagation = (event: React.MouseEvent<HTMLElement>): void => {
    event.stopPropagation();
  };

  return (
    <Popover
      open={open}
      anchorEl={anchorEl}
      onClose={handleClose}
      onMouseDown={stopPropagation}
      anchorOrigin={
        anchorOrigin ?? {
          vertical: "bottom",
          horizontal: "center",
        }
      }
      transformOrigin={
        transformOrigin ?? {
          vertical: "top",
          horizontal: "center",
        }
      }
      {...rest}
    >
      <Stack sx={sx}>
        {items.map((item, index) => (
          <Box key={index} role="menuitem">
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

export type MenuPopoverBuilderProps = SharedProps & {
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

  const handleOpen = (): void => {
    setAnchorEl(ref);
  };

  const handleClose = (): void => {
    setAnchorEl(null);
  };

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
