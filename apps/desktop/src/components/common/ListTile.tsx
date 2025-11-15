import {
  Box,
  IconButton,
  ListItem,
  ListItemButton,
  ListItemText,
  Stack,
  Typography,
  type SxProps,
} from "@mui/material";
import { forwardRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { OverflowTypography } from "./OverflowTypography";

type HoverButtonProps = {
  idle?: React.ReactNode;
  hover?: React.ReactNode;
  hovered?: boolean;
  onClick?: (event: React.MouseEvent<HTMLDivElement>) => void;
  left?: boolean;
};

const HoverButton = ({
  idle,
  hover,
  hovered,
  onClick,
  left,
}: HoverButtonProps) => {
  const hoverState = hovered && hover;

  const handleClick = (event: React.MouseEvent<HTMLDivElement>) => {
    event.stopPropagation();
    onClick?.(event);
  };

  const handleMouseDown = (event: React.MouseEvent<HTMLDivElement>) => {
    event.stopPropagation();
  };

  return (
    <Box
      flexShrink={0}
      sx={{
        display: "inline-flex",
        ml: left ? undefined : 1,
        mr: left ? 1 : undefined,
      }}
    >
      <Typography
        variant="body2"
        component="span"
        fontWeight="bold"
        sx={{ display: "flex", alignItems: "center" }}
      >
        <Box sx={{ display: hoverState ? "none" : "inline-flex" }}>{idle}</Box>
        <IconButton
          onClick={handleClick}
          onMouseDown={handleMouseDown}
          component="div"
          size="small"
          sx={{
            my: -1,
            mr: left ? undefined : -1.5,
            ml: left ? -1.5 : undefined,
            display: hoverState ? "inline-flex" : "none",
          }}
        >
          {hover}
        </IconButton>
      </Typography>
    </Box>
  );
};

export type ListTileProps = {
  title?: React.ReactNode;
  subtitle?: React.ReactNode;
  trailing?: React.ReactNode;
  trailingHover?: React.ReactNode;
  trailingOnClick?: (event: React.MouseEvent<HTMLDivElement>) => void;
  leading?: React.ReactNode;
  leadingHover?: React.ReactNode;
  leadingOnClick?: (event: React.MouseEvent<HTMLDivElement>) => void;
  onClick?: (event: React.MouseEvent<HTMLDivElement>) => void;
  selected?: boolean;
  sx?: SxProps;
  href?: string;
  disabled?: boolean;
  disableRipple?: boolean;
};

export const ListTile = forwardRef<HTMLDivElement, ListTileProps>(
  (
    {
      title,
      subtitle,
      trailing,
      trailingHover,
      trailingOnClick,
      leading,
      leadingHover,
      leadingOnClick,
      onClick,
      selected = false,
      sx,
      href,
      disabled,
      disableRipple,
    },
    ref
  ) => {
    const [hovered, setHovered] = useState(false);
    const nav = useNavigate();

    const onMouseEnter = () => {
      setHovered(true);
    };

    const onMouseLeave = () => {
      setHovered(false);
    };

    const handleClickLeading = (event: React.MouseEvent<HTMLDivElement>) => {
      event.stopPropagation();
      leadingOnClick?.(event);
    };

    const handleClickTrailing = (event: React.MouseEvent<HTMLDivElement>) => {
      event.stopPropagation();
      trailingOnClick?.(event);
    };

    const handleClick = (event: React.MouseEvent<HTMLDivElement>) => {
      if (href) {
        if (event.metaKey || event.ctrlKey) {
          window.open(href, "_blank");
        } else {
          event.preventDefault();
          nav(href);
        }
      }

      onClick?.(event);
    };

    return (
      <ListItem
        ref={ref}
        component="div"
        disablePadding
        onMouseEnter={onMouseEnter}
        onMouseLeave={onMouseLeave}
        sx={sx}
      >
        <ListItemButton
          selected={selected}
          onClick={handleClick}
          disabled={disabled}
          disableRipple={disableRipple}
        >
          <Stack direction="row" alignItems="center" width="100%">
            {Boolean(leading) && (
              <HoverButton
                idle={leading}
                hover={leadingHover}
                hovered={hovered}
                onClick={handleClickLeading}
                left={true}
              />
            )}
            <Box flexGrow={1} sx={{ overflow: "hidden" }}>
              <ListItemText
                primary={<OverflowTypography>{title}</OverflowTypography>}
                secondary={subtitle}
              />
            </Box>
            {Boolean(trailing) && (
              <HoverButton
                idle={trailing}
                hover={trailingHover}
                hovered={hovered}
                onClick={handleClickTrailing}
                left={false}
              />
            )}
          </Stack>
        </ListItemButton>
      </ListItem>
    );
  }
);
