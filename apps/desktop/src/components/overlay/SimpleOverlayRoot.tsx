import { invoke } from "@tauri-apps/api/core";
import {
  getCurrentWindow,
  LogicalPosition,
  LogicalSize,
  PhysicalPosition,
  PhysicalSize,
} from "@tauri-apps/api/window";
import { Box, Button } from "@mui/material";
import { useEffect, useMemo, useRef } from "react";
import { useIntervalAsync } from "../../hooks/helper.hooks";
import { getPlatform } from "../../utils/platform.utils";

interface MonitorAtCursor {
  x: number;
  y: number;
  width: number;
  height: number;
  visibleX: number;
  visibleY: number;
  visibleWidth: number;
  visibleHeight: number;
  scaleFactor: number;
  cursorX: number;
  cursorY: number;
}

const OVERLAY_WIDTH = 400;
const OVERLAY_HEIGHT = 200;
const CURSOR_POLL_MS = 100;
const SWITCH_DEBOUNCE_MS = 200;

function getMonitorKey(monitor: MonitorAtCursor): string {
  return `${monitor.x},${monitor.y},${monitor.width},${monitor.height}`;
}

async function repositionOverlay(
  windowRef: ReturnType<typeof getCurrentWindow>,
  monitor: MonitorAtCursor,
): Promise<void> {
  const platform = getPlatform();

  const centerX = monitor.visibleX + (monitor.visibleWidth - OVERLAY_WIDTH) / 2;
  const posY = monitor.visibleY + monitor.visibleHeight * 0.75;

  if (platform === "windows") {
    await windowRef.setSize(new PhysicalSize(OVERLAY_WIDTH, OVERLAY_HEIGHT));
    await windowRef.setPosition(new PhysicalPosition(centerX, posY));
  } else if (platform === "macos") {
    await windowRef.setSize(new LogicalSize(OVERLAY_WIDTH, OVERLAY_HEIGHT));
    const topY = monitor.height - monitor.visibleY - monitor.visibleHeight + monitor.visibleHeight * 0.75;
    const logicalCenterX = monitor.visibleX + (monitor.visibleWidth - OVERLAY_WIDTH) / 2;
    await windowRef.setPosition(new LogicalPosition(logicalCenterX, topY));
  } else {
    await windowRef.setSize(new LogicalSize(OVERLAY_WIDTH, OVERLAY_HEIGHT));
    await windowRef.setPosition(new LogicalPosition(centerX, posY));
  }
}

export const SimpleOverlayRoot = () => {
  const windowRef = useMemo(() => getCurrentWindow(), []);
  const currentMonitorIdRef = useRef<string | null>(null);
  const lastSwitchTimeRef = useRef(0);
  const isRepositioningRef = useRef(false);

  useEffect(() => {
    document.body.style.margin = "0";
    document.body.style.padding = "0";
    document.body.style.overflow = "hidden";
    document.body.style.backgroundColor = "transparent";
  }, []);

  useIntervalAsync(
    CURSOR_POLL_MS,
    async () => {
      if (isRepositioningRef.current) return;

      const targetMonitor = await invoke<MonitorAtCursor | null>(
        "get_monitor_at_cursor",
      ).catch(() => null);

      if (!targetMonitor) return;

      const targetId = getMonitorKey(targetMonitor);

      if (currentMonitorIdRef.current === null) {
        currentMonitorIdRef.current = targetId;
        return;
      }

      if (targetId === currentMonitorIdRef.current) return;

      const now = Date.now();
      if (now - lastSwitchTimeRef.current < SWITCH_DEBOUNCE_MS) return;

      isRepositioningRef.current = true;
      lastSwitchTimeRef.current = now;

      try {
        await repositionOverlay(windowRef, targetMonitor);
        currentMonitorIdRef.current = targetId;
      } finally {
        isRepositioningRef.current = false;
      }
    },
    [windowRef],
  );

  const handleClick = () => {
    console.log("Button clicked");
  };

  return (
    <Box
      sx={{
        width: "100vw",
        height: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "#2196f3",
        borderRadius: "8px",
      }}
    >
      <Button
        variant="contained"
        onClick={handleClick}
        sx={{
          backgroundColor: "#1976d2",
          "&:hover": {
            backgroundColor: "#1565c0",
          },
        }}
      >
        text
      </Button>
    </Box>
  );
};
