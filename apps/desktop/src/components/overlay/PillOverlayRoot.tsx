import { Box, Typography } from "@mui/material";
import { alpha, useTheme } from "@mui/material/styles";
import { useEffect, useState } from "react";
import { FormattedMessage } from "react-intl";
import { useAppStore } from "../../store";
import { useTauriListen } from "../../hooks/tauri.hooks";
import {
  DICTATE_HOTKEY,
  getHotkeyCombosForAction,
} from "../../utils/keyboard.utils";
import { HotkeyBadge } from "../common/HotkeyBadge";

export const PILL_OVERLAY_WIDTH = 300;
export const PILL_OVERLAY_HEIGHT = 96;
export const MIN_PILL_WIDTH = 48;
export const MIN_PILL_HEIGHT = 6;
export const MIN_PILL_HOVER_PADDING = 12;
export const EXPANDED_PILL_WIDTH = 120;
export const EXPANDED_PILL_HEIGHT = 32;

type PillHoverPayload = {
  hovered: boolean;
};

export const PillOverlayRoot = () => {
  const [isHovered, setIsHovered] = useState(false);
  const theme = useTheme();
  const combos = useAppStore((state) =>
    getHotkeyCombosForAction(state, DICTATE_HOTKEY),
  );
  const hotkeyKeys = combos.length > 0 ? combos[0] : ["?"];

  useEffect(() => {
    document.body.style.margin = "0";
    document.body.style.padding = "0";
    document.body.style.overflow = "hidden";
    document.body.style.backgroundColor = "transparent";
  }, []);

  useTauriListen<PillHoverPayload>("pill_hover", (payload) => {
    setIsHovered(payload.hovered);
  });

  return (
    <Box
      sx={{
        width: "100vw",
        height: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "flex-end",
      }}
    >
      {/* Tooltip */}
      <Box
        sx={{
          opacity: isHovered ? 1 : 0,
          transform: isHovered ? "translateY(0)" : "translateY(4px)",
          transition: "all 150ms ease-out",
          marginBottom: theme.spacing(1),
          pointerEvents: "none",
        }}
      >
        <Box
          sx={{
            backgroundColor: alpha(theme.palette.common.black, 0.92),
            backdropFilter: "blur(14px)",
            borderRadius: theme.spacing(1.5),
            padding: `${theme.spacing(0.75)} ${theme.spacing(1.5)}`,
          }}
        >
          <Typography
            variant="caption"
            sx={{
              color: theme.palette.common.white,
              whiteSpace: "nowrap",
              fontWeight: 500,
              display: "flex",
              alignItems: "center",
              gap: 0.5,
            }}
            component="span"
          >
            <FormattedMessage
              defaultMessage="You can also hold {hotkey} to dictate"
              values={{
                hotkey: (
                  <HotkeyBadge
                    keys={hotkeyKeys}
                    sx={{
                      bgcolor: alpha(theme.palette.common.white, 0.15),
                      borderColor: alpha(theme.palette.common.white, 0.3),
                      color: theme.palette.common.white,
                      fontSize: "inherit",
                      py: 0,
                      px: 0.75,
                    }}
                  />
                ),
              }}
            />
          </Typography>
        </Box>
      </Box>

      {/* Pill with hover zone */}
      <Box
        sx={{
          paddingBottom: `${MIN_PILL_HOVER_PADDING}px`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Box
          sx={{
            width: isHovered ? EXPANDED_PILL_WIDTH : MIN_PILL_WIDTH,
            height: isHovered ? EXPANDED_PILL_HEIGHT : MIN_PILL_HEIGHT,
            borderRadius: isHovered ? theme.spacing(2) : theme.spacing(0.75),
            backgroundColor: alpha(
              theme.palette.common.black,
              isHovered ? 0.92 : 0.6,
            ),
            border: `1px solid ${alpha(theme.palette.common.white, 0.3)}`,
            backdropFilter: "blur(14px)",
            transition: "all 200ms ease-out",
            overflow: "hidden",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
          }}
        >
          <Typography
            sx={{
              color: alpha(theme.palette.common.white, 0.4),
              fontSize: "11px",
              fontWeight: 500,
              letterSpacing: "0.02em",
              whiteSpace: "nowrap",
              opacity: isHovered ? 1 : 0,
              transition: "opacity 150ms ease-out",
            }}
          >
            <FormattedMessage defaultMessage="Click to dictate" />
          </Typography>
        </Box>
      </Box>
    </Box>
  );
};
