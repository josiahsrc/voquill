import { Box, type SxProps, type Theme } from "@mui/material";
import {
  type ReactNode,
  type Ref,
  type UIEventHandler,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

type FadingScrollAreaProps = {
  fadeHeight?: number;
  children: ReactNode;
  sx?: SxProps<Theme>;
  viewportRef?: Ref<HTMLDivElement>;
  onScroll?: UIEventHandler<HTMLDivElement>;
};

export const FadingScrollArea = ({
  fadeHeight = 24,
  children,
  sx,
  viewportRef,
  onScroll,
}: FadingScrollAreaProps) => {
  const [topOpacity, setTopOpacity] = useState(0);
  const [bottomOpacity, setBottomOpacity] = useState(0);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const contentNodeRef = useRef<HTMLDivElement | null>(null);
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

  const reconnectObserver = useCallback(() => {
    observerRef.current?.disconnect();
    observerRef.current = null;

    if (typeof ResizeObserver === "undefined") return;

    const viewportNode = scrollRef.current;
    const contentNode = contentNodeRef.current;
    if (!viewportNode || !contentNode) return;

    const observer = new ResizeObserver(recalculate);
    observer.observe(viewportNode);
    observer.observe(contentNode);
    observerRef.current = observer;
    recalculate();
  }, [recalculate]);

  const viewportRefCallback = useCallback(
    (node: HTMLDivElement | null) => {
      scrollRef.current = node;
      if (typeof viewportRef === "function") {
        viewportRef(node);
      } else if (viewportRef) {
        (viewportRef as { current: HTMLDivElement | null }).current = node;
      }
      reconnectObserver();
    },
    [reconnectObserver, viewportRef],
  );

  const contentRefCallback = useCallback(
    (node: HTMLDivElement | null) => {
      contentNodeRef.current = node;
      reconnectObserver();
    },
    [reconnectObserver],
  );

  const handleScroll = useCallback<UIEventHandler<HTMLDivElement>>(
    (event) => {
      recalculate();
      onScroll?.(event);
    },
    [onScroll, recalculate],
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
        ref={viewportRefCallback}
        onScroll={handleScroll}
        sx={{ height: "100%", overflowY: "auto", ...sx }}
      >
        <Box ref={contentRefCallback} sx={{ minHeight: "100%" }}>
          {children}
        </Box>
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
