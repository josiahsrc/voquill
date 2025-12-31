import { Box } from "@mui/material";
import {
  availableMonitors,
  cursorPosition,
  getCurrentWindow,
  LogicalPosition,
  PhysicalPosition,
} from "@tauri-apps/api/window";
import { useEffect, useMemo } from "react";
import { useAppStore } from "../../store";
import { getPlatform } from "../../utils/platform.utils";
import { ToastItem } from "./ToastItem";

const TOAST_WIDTH = 350;
const TOAST_HEIGHT = 100;
const TOP_MARGIN = 16;
const RIGHT_MARGIN = 16;

export const ToastRend = () => {
  const windowRef = useMemo(() => getCurrentWindow(), []);
  const currentToast = useAppStore((state) => state.currentToast);
  const isVisible = currentToast !== null;

  // Initialize window settings
  useEffect(() => {
    document.body.style.backgroundColor = "transparent";
    document.body.style.margin = "0";

    const initialize = async () => {
      try {
        await windowRef.setIgnoreCursorEvents(true);
        await windowRef.hide();
      } catch (err) {
        console.error("Failed to initialize toast window", err);
      }
    };

    initialize().catch(() => {});
  }, [windowRef]);

  // Handle visibility and positioning
  useEffect(() => {
    let canceled = false;

    const syncVisibility = async () => {
      try {
        if (isVisible) {
          const [monitors, cursor] = await Promise.all([
            availableMonitors().catch(() => null),
            cursorPosition().catch(() => null),
          ]);

          // Find monitor containing cursor
          let targetMonitor =
            monitors?.find((monitor) => {
              if (!cursor) {
                return false;
              }
              const withinX =
                cursor.x >= monitor.position.x &&
                cursor.x < monitor.position.x + monitor.size.width;
              const withinY =
                cursor.y >= monitor.position.y &&
                cursor.y < monitor.position.y + monitor.size.height;
              return withinX && withinY;
            }) ??
            monitors?.[0] ??
            null;

          if (canceled) {
            return;
          }

          if (targetMonitor) {
            const platform = getPlatform();
            const scaleFactor = targetMonitor.scaleFactor ?? 1;

            if (platform === "windows") {
              // Use physical coordinates on Windows
              const physicalToastWidth = Math.round(TOAST_WIDTH * scaleFactor);
              const physicalX = Math.round(
                targetMonitor.position.x +
                  targetMonitor.size.width -
                  physicalToastWidth -
                  RIGHT_MARGIN * scaleFactor,
              );
              const physicalY = Math.round(
                targetMonitor.position.y + TOP_MARGIN * scaleFactor,
              );

              await windowRef.setPosition(
                new PhysicalPosition(physicalX, physicalY),
              );
            } else {
              // Other platforms: use logical coordinates
              const logicalWidth = targetMonitor.size.width / scaleFactor;
              const logicalX = Math.round(
                targetMonitor.position.x / scaleFactor +
                  logicalWidth -
                  TOAST_WIDTH -
                  RIGHT_MARGIN,
              );
              const logicalY = Math.round(
                targetMonitor.position.y / scaleFactor + TOP_MARGIN,
              );

              await windowRef.setPosition(
                new LogicalPosition(logicalX, logicalY),
              );
            }
          }

          if (canceled) {
            return;
          }

          await windowRef.show();
          await windowRef.setAlwaysOnTop(true);
          await windowRef.setIgnoreCursorEvents(true);
        } else {
          await windowRef.hide();
        }
      } catch (err) {
        if (!canceled) {
          console.error("Failed to toggle toast visibility", err);
        }
      }
    };

    syncVisibility().catch(() => {});

    return () => {
      canceled = true;
    };
  }, [windowRef, isVisible]);

  if (!isVisible || !currentToast) {
    return null;
  }

  return (
    <Box
      sx={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        display: "flex",
        justifyContent: "flex-end",
        alignItems: "flex-start",
        pointerEvents: "none",
        backgroundColor: "transparent",
        padding: `${TOP_MARGIN}px ${RIGHT_MARGIN}px`,
      }}
    >
      <Box
        sx={{
          width: `${TOAST_WIDTH}px`,
          maxWidth: "100%",
        }}
      >
        <ToastItem toast={currentToast} />
      </Box>
    </Box>
  );
};
