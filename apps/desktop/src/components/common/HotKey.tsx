import * as React from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ClickAwayListener,
  Stack,
  Paper,
  Typography,
} from "@mui/material";
import { useTheme } from "@mui/material/styles";
import { useAppStore } from "../../store";
import { getPrettyKeyName } from "../../utils/keyboard.utils";

type HotKeyProps = {
  value?: string[];
  onChange: (combo: string[]) => void;
};

function normalizeKeys(keys: string[] | undefined) {
  return [...(keys ?? [])].sort();
}

export const HotKey: React.FC<HotKeyProps> = ({ value, onChange }) => {
  const theme = useTheme();
  const [recording, setRecording] = useState(false);
  const [focused, setFocused] = useState(false);
  const keysHeld = useAppStore((s) => s.keysHeld) as string[]; // e.g., ["LeftShift","KeyA"]
  const normalizedHeld = useMemo(() => normalizeKeys(keysHeld), [keysHeld]);

  // Track the last full set before any key was released.
  const lastFullSetRef = useRef<string[]>([]);
  const prevHeldRef = useRef<string[]>([]);

  // Focus management
  const boxRef = useRef<HTMLDivElement | null>(null);

  // Start recording on click/focus. Clear current value.
  const beginRecording = () => {
    setRecording(true);
    setFocused(true);
    lastFullSetRef.current = [];
    prevHeldRef.current = [];
    onChange([]); // reset to empty at start
    // move focus for Escape handling
    boxRef.current?.focus();
  };

  const endRecording = () => {
    setRecording(false);
    setFocused(false);
  };

  // Handle keys during recording
  useEffect(() => {
    if (!recording) return;

    const prev = prevHeldRef.current;
    const curr = normalizedHeld;

    // If the set grew or changed size equal but different, update last full set.
    const grew = curr.length > prev.length;
    const sameSizeDifferent =
      curr.length === prev.length &&
      (curr.length !== 0 || prev.length !== 0) &&
      curr.join(",") !== prev.join(",");

    if (grew || sameSizeDifferent) {
      lastFullSetRef.current = curr;
    }

    // If any key was released (set shrank), emit the previous full set and stop.
    const shrank = curr.length < prev.length;
    if (shrank) {
      const combo = lastFullSetRef.current;
      onChange(combo);
      endRecording();
    }

    prevHeldRef.current = curr;
  }, [normalizedHeld, recording, onChange]);

  // Escape cancels/unfocus
  useEffect(() => {
    if (!recording) return;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        endRecording();
      }
    };

    window.addEventListener("keydown", onKeyDown, { capture: true });
    return () =>
      window.removeEventListener("keydown", onKeyDown, {
        capture: true,
      } as any);
  }, [recording]);

  return (
    <ClickAwayListener
      onClickAway={() => {
        if (recording) endRecording();
        else setFocused(false);
      }}
    >
      <Paper
        ref={boxRef}
        role="button"
        tabIndex={0}
        elevation={0}
        onClick={beginRecording}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        onKeyDown={(e) => {
          // Allow keyboard users to start recording with Enter or Space
          if (!recording && (e.key === "Enter" || e.key === " ")) {
            e.preventDefault();
            beginRecording();
          }
          // Also honor Escape here if focus is on the box
          if (recording && e.key === "Escape") {
            e.preventDefault();
            endRecording();
          }
        }}
        sx={{
          px: 1.5,
          py: 1,
          minHeight: 48,
          display: "flex",
          alignItems: "center",
          cursor: "pointer",
          borderRadius: 1.5,
          border:
            recording || focused
              ? `2px solid ${theme.palette.primary.main}`
              : `2px solid transparent`,
          boxShadow: recording || focused ? theme.shadows[4] : theme.shadows[0],
          transition: "box-shadow 120ms ease-in",
          userSelect: "none",
        }}
        aria-pressed={recording ? "true" : "false"}
        aria-label="Hotkey recorder"
      >
        <Stack
          direction="row"
          spacing={1}
          alignItems="center"
          sx={{ width: "100%", flexWrap: "wrap", rowGap: 0.5 }}
        >
          {recording ? (
            normalizedHeld.length ? (
              normalizedHeld.map(getPrettyKeyName).join("+")
            ) : (
              <Typography variant="body2" color="text.secondary">
                Press keys…
              </Typography>
            )
          ) : (value?.length ?? 0) > 0 ? (
            value?.map(getPrettyKeyName).join("+")
          ) : (
            <Typography variant="body2" color="text.secondary">
              Click to record
            </Typography>
          )}
        </Stack>
      </Paper>
    </ClickAwayListener>
  );
};
