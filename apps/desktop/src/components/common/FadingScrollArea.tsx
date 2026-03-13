import { Box, type SxProps, type Theme } from "@mui/material";
import { type ReactNode, useCallback, useEffect, useRef, useState } from "react";

type FadingScrollAreaProps = {
  fadeHeight?: number;
  children: ReactNode;
  sx?: SxProps<Theme>;
};

export const FadingScrollArea = ({
  fadeHeight = 24,
  children,
  sx,
}: FadingScrollAreaProps) => {
  const [topOpacity, setTopOpacity] = useState(0);
  const [bottomOpacity, setBottomOpacity] = useState(0);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const observerRef = useRef<ResizeObserver | null>(null);

  const recalculate = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;

    const { scrollTop, scrollHeight, clientHeight } = el;
    const maxScroll = scrollHeight - clientHeight;

    if (maxScroll <= 0) {
      setTopOpacity(0);
      setBottomOpacity(0);
      return;
    }

    setTopOpacity(Math.min(scrollTop / fadeHeight, 1));
    setBottomOpacity(Math.min((maxScroll - scrollTop) / fadeHeight, 1));
  }, [fadeHeight]);

  const refCallback = useCallback(
    (node: HTMLDivElement | null) => {
      if (observerRef.current) {
        observerRef.current.disconnect();
        observerRef.current = null;
      }

      scrollRef.current = node;

      if (node) {
        recalculate();

        const observer = new ResizeObserver(recalculate);
        observer.observe(node);
        if (node.firstElementChild) {
          observer.observe(node.firstElementChild);
        }
        observerRef.current = observer;
      }
    },
    [recalculate],
  );

  useEffect(() => {
    return () => {
      observerRef.current?.disconnect();
    };
  }, []);

  return (
    <Box sx={{ flexGrow: 1, position: "relative", overflow: "hidden" }}>
      <Box
        sx={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          height: fadeHeight,
          background: (theme) =>
            `linear-gradient(${theme.vars?.palette.level1}, transparent)`,
          zIndex: 1,
          pointerEvents: "none",
          opacity: topOpacity,
          transition: "opacity 150ms ease",
        }}
      />
      <Box
        ref={refCallback}
        onScroll={recalculate}
        sx={{ height: "100%", overflowY: "auto", ...sx }}
      >
        {children}
      </Box>
      <Box
        sx={{
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          height: fadeHeight,
          background: (theme) =>
            `linear-gradient(transparent, ${theme.vars?.palette.level1})`,
          zIndex: 1,
          pointerEvents: "none",
          opacity: bottomOpacity,
          transition: "opacity 150ms ease",
        }}
      />
    </Box>
  );
};
