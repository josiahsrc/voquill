import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import { keyframes } from "@mui/material/styles";
import { useEffect, useMemo, useRef, useState } from "react";
import { useAppStore } from "../../store";
import { getPrettyKeyName } from "../../utils/keyboard.utils";

type HotKeyProps = {
  value?: string[];
  onChange?: (value: string[]) => void;
};

const pulseBorder = keyframes`
  0%, 100% {
    border-color: rgba(25, 118, 210, 0.5);
  }
  50% {
    border-color: rgba(25, 118, 210, 1);
  }
`;

export const HotKey = ({ value, onChange }: HotKeyProps) => {
  const boxRef = useRef<HTMLDivElement | null>(null);
  const [focused, setFocused] = useState(false);
  const [hasInteracted, setHasInteracted] = useState(false);
  const keysHeld = useAppStore((s) => s.keysHeld);

  const lastEmittedRef = useRef<string[]>(value);
  useEffect(() => {
    lastEmittedRef.current = value;
  }, [value]);

  const previousKeysHeldRef = useRef<string[]>([]);

  useEffect(() => {
    if (!focused) {
      previousKeysHeldRef.current = [];
      return;
    }

    if (!hasInteracted) {
      lastEmittedRef.current = [];
    }

    const seen = new Set<string>();
    const held = keysHeld.filter((k: string) => {
      if (seen.has(k)) {
        return false;
      }
      seen.add(k);
      return true;
    });

    const last = lastEmittedRef.current ?? [];

    const previousHeld = previousKeysHeldRef.current;
    if (
      hasInteracted &&
      previousHeld.length > 0 &&
      held.length < previousHeld.length
    ) {
      boxRef.current?.blur();
      previousKeysHeldRef.current = [];
      return;
    }

    previousKeysHeldRef.current = held;

    if (held.length === 0) {
      return;
    }

    if (held.length === 1 && held[0] === "Escape") {
      boxRef.current?.blur();
      return;
    }

    setHasInteracted(true);

    const lastSet = new Set(last);
    const anyNewKey = held.some((k) => !lastSet.has(k));
    if (held.length > last.length || anyNewKey) {
      lastEmittedRef.current = held;
      onChange?.(held);
    }
  }, [keysHeld, focused, onChange, hasInteracted]);

  const [empty, label] = useMemo(() => {
    if (focused && !hasInteracted) {
      return [true, "Listening..."];
    }
    const v = value ?? [];
    return v.length > 0
      ? [false, v.map((k) => getPrettyKeyName(k)).join(" + ")]
      : [true, "Change hotkey"];
  }, [value, focused, hasInteracted]);

  return (
    <Box
      ref={boxRef}
      tabIndex={0}
      onClick={() => boxRef.current?.focus()}
      onFocus={() => setFocused(true)}
      onBlur={() => {
        setFocused(false);
        setHasInteracted(false);
      }}
      sx={{
        width: 200,
        height: 40,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        borderRadius: 1,
        cursor: "pointer",
        bgcolor: (t) =>
          focused ? t.vars?.palette.level2 : t.vars?.palette.level1,
        border: focused ? "2px solid" : "2px solid transparent",
        animation: focused ? `${pulseBorder} 2s ease-in-out infinite` : "none",
        outline: "none",
        "&:hover": {
          border: (t) =>
            focused ? "2px solid" : `2px solid ${t.vars?.palette.divider}`,
        },
      }}
    >
      <Typography
        variant="body2"
        color={empty ? "text.disabled" : "text.primary"}
      >
        {label}
      </Typography>
    </Box>
  );
};
