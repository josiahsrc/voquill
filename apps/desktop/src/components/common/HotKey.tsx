import * as React from "react";
import { useEffect, useRef, useState } from "react";
import { Button, Chip, Tooltip, Stack } from "@mui/material";
import KeyboardIcon from "@mui/icons-material/Keyboard";
import FiberManualRecordIcon from "@mui/icons-material/FiberManualRecord";

export type HotKeyProps = {
  /** Current selected combo, e.g. "Ctrl+Shift+K" */
  value?: string;
  /** Called with the newly recorded combo */
  onChange: (combo: string) => void;
  /** Optional button label */
  label?: string;
  /** Optional disabled state */
  disabled?: boolean;
  className?: string;
};

export const HotKey: React.FC<HotKeyProps> = ({
  value,
  onChange,
  label = "Set Hotkey",
  disabled,
  className,
}) => {
  const [recording, setRecording] = useState(false);
  const detachRef = useRef<() => void>(null);

  const isMac =
    typeof navigator !== "undefined" && /Mac/i.test(navigator.platform);

  // Normalizes the non-modifier key into a readable label
  const normalizeKey = (e: KeyboardEvent): string | null => {
    const k = e.key;
    if (!k) return null;

    // Ignore pure modifier presses
    if (["Shift", "Control", "Alt", "Meta"].includes(k)) return null;

    // Map whitespace and common named keys
    const named: Record<string, string> = {
      " ": "Space",
      ArrowUp: "ArrowUp",
      ArrowDown: "ArrowDown",
      ArrowLeft: "ArrowLeft",
      ArrowRight: "ArrowRight",
      Escape: "Esc",
      Esc: "Esc",
      Enter: "Enter",
      Tab: "Tab",
      Backspace: "Backspace",
      Delete: "Delete",
      Home: "Home",
      End: "End",
      PageUp: "PageUp",
      PageDown: "PageDown",
      PrintScreen: "PrintScreen",
      ContextMenu: "ContextMenu",
    };

    if (named[k]) return named[k];

    // Function keys
    if (/^F\d{1,2}$/i.test(k)) return k.toUpperCase();

    // Single character keys
    if (k.length === 1) {
      // Keep digits and symbols as-is, letters uppercased
      const upper = k.toUpperCase();
      return upper;
    }

    // Fallback to code when key is ambiguous
    const code = (e.code || "").replace("Key", "").replace("Digit", "");
    if (code) return code.toUpperCase();

    return k;
  };

  const buildCombo = (e: KeyboardEvent): string | null => {
    const parts: string[] = [];
    if (e.ctrlKey) parts.push("Ctrl");
    if (e.altKey) parts.push("Alt");
    if (e.shiftKey) parts.push("Shift");
    if (e.metaKey) parts.push(isMac ? "Cmd" : "Meta");

    const key = normalizeKey(e);
    if (!key) return null; // wait for a non-modifier key

    parts.push(key);
    return parts.join("+");
  };

  const startRecording = () => {
    if (recording || disabled) return;
    setRecording(true);

    const onKeyDown = (e: KeyboardEvent) => {
      // Cancel with Escape
      if (e.key === "Escape") {
        e.preventDefault();
        e.stopPropagation();
        stopRecording();
        return;
      }

      const combo = buildCombo(e);
      if (!combo) {
        // Only modifiers so far. Keep listening.
        e.preventDefault();
        e.stopPropagation();
        return;
      }

      e.preventDefault();
      e.stopPropagation();
      onChange(combo);
      stopRecording();
    };

    // Capture globally so inputs do not consume the event during recording
    window.addEventListener("keydown", onKeyDown, { capture: true });
    detachRef.current = () => {
      window.removeEventListener("keydown", onKeyDown, {
        capture: true,
      } as any);
    };
  };

  const stopRecording = () => {
    setRecording(false);
    if (detachRef.current) {
      detachRef.current();
      detachRef.current = null;
    }
  };

  useEffect(() => {
    return () => {
      // Cleanup on unmount
      if (detachRef.current) {
        detachRef.current();
      }
    };
  }, []);

  return (
    <Stack
      direction="row"
      spacing={1}
      alignItems="center"
      className={className}
    >
      <Tooltip
        title={
          recording
            ? "Recording… Press a key combo. Esc to cancel."
            : "Click to record a new hotkey"
        }
        arrow
        placement="top"
      >
        <span>
          <Button
            variant={recording ? "contained" : "outlined"}
            color={recording ? "warning" : "primary"}
            size="small"
            startIcon={recording ? <FiberManualRecordIcon /> : <KeyboardIcon />}
            onClick={recording ? stopRecording : startRecording}
            disabled={disabled}
          >
            {recording ? "Recording…" : label}
          </Button>
        </span>
      </Tooltip>

      <Chip
        label={value ? value : "Unassigned"}
        variant={value ? "filled" : "outlined"}
        size="small"
        sx={{ fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace" }}
      />
    </Stack>
  );
};
