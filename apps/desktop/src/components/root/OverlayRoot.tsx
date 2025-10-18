import { useEffect, useMemo } from "react";
import { Box } from "@mui/material";
import {
  availableMonitors,
  cursorPosition,
  currentMonitor,
  getCurrentWindow,
  LogicalPosition,
} from "@tauri-apps/api/window";
import { RecordingStatusWidget } from "./RecordingStatusWidget";
import { useRecordingTelemetry } from "../../hooks/useRecordingTelemetry";

const OVERLAY_WIDTH = 360;
const OVERLAY_HEIGHT = 80;
const TOP_MARGIN = 18;

export const OverlayRoot = () => {
  const windowRef = useMemo(() => getCurrentWindow(), []);
  const { recordingState } = useRecordingTelemetry();
  const isVisible = recordingState.phase !== "idle";

  useEffect(() => {
    document.body.style.backgroundColor = "transparent";
    document.body.style.margin = "0";

    const initialize = async () => {
      try {
        await windowRef.setIgnoreCursorEvents(true);
        await windowRef.hide();
      } catch (err) {
        console.error("Failed to initialize overlay window", err);
      }
    };

    initialize().catch(() => {});
  }, [windowRef]);

  useEffect(() => {
    let canceled = false;

    const syncVisibility = async () => {
      try {
        if (isVisible) {
          const [monitors, cursor] = await Promise.all([
            availableMonitors().catch(() => null),
            cursorPosition().catch(() => null),
          ]);

          let targetMonitor =
            monitors?.find((monitor) => {
              if (!cursor) {
                return false;
              }
              const withinX =
                cursor.x >= monitor.position.x &&
                cursor.x <
                  monitor.position.x + monitor.size.width;
              const withinY =
                cursor.y >= monitor.position.y &&
                cursor.y <
                  monitor.position.y + monitor.size.height;
              return withinX && withinY;
            }) ?? monitors?.[0];

          if (!targetMonitor) {
            targetMonitor = await currentMonitor().catch(() => null);
          }

          if (canceled) {
            return;
          }

          if (targetMonitor) {
            const scaleFactor = targetMonitor.scaleFactor ?? 1;
            const logicalWidth = targetMonitor.size.width / scaleFactor;
            const logicalX = Math.round(
              targetMonitor.position.x / scaleFactor +
                logicalWidth / 2 -
                OVERLAY_WIDTH / 2,
            );
            const logicalY = Math.round(
              targetMonitor.position.y / scaleFactor + TOP_MARGIN,
            );

            await windowRef.setPosition(
              new LogicalPosition(logicalX, logicalY),
            );
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
          console.error("Failed to toggle overlay visibility", err);
        }
      }
    };

    syncVisibility().catch(() => {});

    return () => {
      canceled = true;
    };
  }, [windowRef, isVisible]);

  if (!isVisible) {
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
        justifyContent: "center",
        alignItems: "flex-start",
        pointerEvents: "none",
        backgroundColor: "transparent",
      }}
    >
      <Box
        sx={{
          marginTop: `${TOP_MARGIN}px`,
          width: `${OVERLAY_WIDTH}px`,
          height: `${OVERLAY_HEIGHT}px`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <RecordingStatusWidget recordingState={recordingState} />
      </Box>
    </Box>
  );
};
