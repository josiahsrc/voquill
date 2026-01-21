import { Box } from "@mui/material";
import { invoke } from "@tauri-apps/api/core";
import {
  availableMonitors,
  cursorPosition,
  getCurrentWindow,
  LogicalPosition,
  LogicalSize,
  PhysicalPosition,
  PhysicalSize,
} from "@tauri-apps/api/window";
import { useEffect, useMemo } from "react";
import { useOverlayClickThrough } from "../../hooks/overlay.hooks";
import { useAppStore } from "../../store";
import { getPlatform } from "../../utils/platform.utils";
import { AgentSection } from "./AgentSection";
import { ToastSection } from "./ToastSection";
import { UnifiedOverlaySideEffects } from "./UnifiedOverlaySideEffects";
import { WaveformSection } from "./WaveformSection";

interface ScreenVisibleArea {
  topInset: number;
  bottomInset: number;
  leftInset: number;
  rightInset: number;
}

// DEBUG: Remove later
const CursorDebug = () => {
  const cursor = useAppStore((state) => state.overlayCursor);
  const element = cursor ? document.elementFromPoint(cursor.x, cursor.y) : null;
  const isInteractive = element?.closest("[data-overlay-interactive]") !== null;

  return (
    <Box
      sx={{
        position: "absolute",
        bottom: 80,
        left: "50%",
        transform: "translateX(-50%)",
        backgroundColor: "rgba(0,0,0,0.9)",
        color: "white",
        padding: "8px 12px",
        borderRadius: 1,
        fontSize: 11,
        fontFamily: "monospace",
        pointerEvents: "none",
        whiteSpace: "pre",
      }}
    >
      {cursor
        ? `pos: ${cursor.x}, ${cursor.y}\nel: ${element?.tagName || "null"}\ninteractive: ${isInteractive}`
        : "loading..."}
    </Box>
  );
};

export const UnifiedOverlayRoot = () => {
  const windowRef = useMemo(() => getCurrentWindow(), []);

  useOverlayClickThrough({ enabled: true });

  useEffect(() => {
    document.body.style.backgroundColor = "transparent";
    document.body.style.margin = "0";
    document.documentElement.style.backgroundColor = "transparent";

    windowRef.hide().catch(console.error);
    windowRef.setIgnoreCursorEvents(true).catch(console.error);
  }, [windowRef]);

  useEffect(() => {
    let canceled = false;

    const syncVisibility = async () => {
      try {
        const [monitors, cursor, visibleArea] = await Promise.all([
          availableMonitors().catch(() => null),
          cursorPosition().catch(() => null),
          invoke<ScreenVisibleArea>("get_screen_visible_area").catch(
            () => null,
          ),
        ]);

        const targetMonitor =
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

          const topInset = visibleArea?.topInset ?? 0;
          const bottomInset = visibleArea?.bottomInset ?? 0;
          const leftInset = visibleArea?.leftInset ?? 0;
          const rightInset = visibleArea?.rightInset ?? 0;

          if (platform === "windows") {
            await windowRef.setSize(
              new PhysicalSize(
                targetMonitor.size.width,
                targetMonitor.size.height,
              ),
            );
            await windowRef.setPosition(
              new PhysicalPosition(
                targetMonitor.position.x,
                targetMonitor.position.y,
              ),
            );
          } else {
            const logicalWidth =
              targetMonitor.size.width / scaleFactor -
              leftInset -
              rightInset;
            const logicalHeight =
              targetMonitor.size.height / scaleFactor -
              topInset -
              bottomInset;
            const logicalX =
              targetMonitor.position.x / scaleFactor + leftInset;
            const logicalY =
              targetMonitor.position.y / scaleFactor + topInset;

            await windowRef.setSize(
              new LogicalSize(logicalWidth, logicalHeight),
            );
            await windowRef.setPosition(
              new LogicalPosition(logicalX, logicalY),
            );
          }
        }

        if (canceled) {
          return;
        }

        await invoke("show_overlay_no_focus");
      } catch (err) {
        if (!canceled) {
          console.error("Failed to toggle overlay visibility", err);
        }
      }
    };

    syncVisibility().catch(() => { });

    return () => {
      canceled = true;
    };
  }, [windowRef]);

  return (
    <>
      <UnifiedOverlaySideEffects />
      <Box
        sx={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: "transparent",
          pointerEvents: "none",
        }}
      >
        <CursorDebug />
        <WaveformSection />
        <ToastSection />
        <AgentSection />
      </Box>
    </>
  );
};
