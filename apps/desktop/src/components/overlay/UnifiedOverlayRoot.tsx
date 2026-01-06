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
import { useEffect, useMemo, useRef } from "react";
import { useUnifiedClickThrough } from "../../hooks/overlay.hooks";
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

export const UnifiedOverlayRoot = () => {
  const windowRef = useMemo(() => getCurrentWindow(), []);

  const overlayPhase = useAppStore((state) => state.overlayPhase);
  const agentPhase = useAppStore((state) => state.agent.overlayPhase);
  const currentToast = useAppStore((state) => state.currentToast);

  const toastRef = useRef<HTMLDivElement>(null);
  const agentRef = useRef<HTMLDivElement>(null);

  const isWaveformActive = overlayPhase !== "idle";
  const isAgentActive = agentPhase !== "idle";
  const isToastActive = currentToast !== null;

  const isAnyActive = isWaveformActive || isAgentActive || isToastActive;

  useUnifiedClickThrough({
    contentRefs: [toastRef, agentRef],
    enabled: isAnyActive,
  });

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
        if (isAnyActive) {
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

          await windowRef.show();
          await windowRef.setAlwaysOnTop(true);
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
  }, [windowRef, isAnyActive]);

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
        <WaveformSection />
        <ToastSection ref={toastRef} />
        <AgentSection ref={agentRef} />
      </Box>
    </>
  );
};
