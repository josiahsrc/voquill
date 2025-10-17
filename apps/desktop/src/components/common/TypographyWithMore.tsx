import { Box, Button, Typography, type TypographyProps } from "@mui/material";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

type TypographyWithMoreProps = TypographyProps & {
  maxLines?: number;
  initiallyExpanded?: boolean;
  moreLabel?: string;
  lessLabel?: string;
};

const defaultClampStyles = (maxLines: number) => ({
  display: "-webkit-box",
  WebkitLineClamp: maxLines,
  WebkitBoxOrient: "vertical" as const,
  overflow: "hidden",
});

const normalizeSxProp = (
  baseClampStyles: Record<string, unknown>,
  shouldClamp: boolean,
  sx: TypographyProps["sx"]
): TypographyProps["sx"] => {
  if (!shouldClamp) {
    return sx;
  }

  return { ...baseClampStyles, ...sx };
};

export function TypographyWithMore({
  children,
  maxLines = 3,
  initiallyExpanded = false,
  moreLabel = "Show more",
  lessLabel = "Show less",
  sx,
  ...typographyProps
}: TypographyWithMoreProps) {
  const [expanded, setExpanded] = useState(initiallyExpanded);
  const [isOverflowing, setIsOverflowing] = useState(false);
  const hiddenTypographyRef = useRef<HTMLElement | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const clampStyles = useMemo(() => defaultClampStyles(maxLines), [maxLines]);

  const measureOverflow = useCallback(() => {
    if (typeof window === "undefined" || !hiddenTypographyRef.current) {
      setIsOverflowing(false);
      return;
    }

    const hiddenNode = hiddenTypographyRef.current;
    const computedStyles = window.getComputedStyle(hiddenNode);
    const lineHeight = parseFloat(computedStyles.lineHeight || "0");

    if (!Number.isFinite(lineHeight) || lineHeight <= 0) {
      setIsOverflowing(false);
      return;
    }

    const collapsedHeight = lineHeight * maxLines;
    const fullHeight = hiddenNode.scrollHeight;
    setIsOverflowing(fullHeight - collapsedHeight > 1);
  }, [maxLines]);

  useEffect(() => {
    if (typeof ResizeObserver === "undefined") {
      measureOverflow();
      return;
    }

    const hiddenNode = hiddenTypographyRef.current;
    const containerNode = containerRef.current;
    if (!hiddenNode && !containerNode) {
      measureOverflow();
      return;
    }

    const observer = new ResizeObserver(() => measureOverflow());

    if (hiddenNode) {
      observer.observe(hiddenNode);
    }

    if (containerNode) {
      observer.observe(containerNode);
    }

    measureOverflow();

    return () => {
      observer.disconnect();
    };
  }, [measureOverflow]);

  useEffect(() => {
    measureOverflow();
  }, [measureOverflow, children]);

  const toggleExpanded = () => setExpanded((prev) => !prev);
  const shouldClamp = isOverflowing && !expanded;

  const typographySx = useMemo(
    () => normalizeSxProp(clampStyles, shouldClamp, sx),
    [clampStyles, shouldClamp, sx]
  );
  const hiddenTypographySx = useMemo(() => {
    const baseDisplay = { display: "block" } as const;

    if (!sx) {
      return baseDisplay;
    }

    if (Array.isArray(sx)) {
      return [baseDisplay, ...sx];
    }

    return [baseDisplay, sx];
  }, [sx]);

  return (
    <Box>
      <Box ref={containerRef} sx={{ position: "relative" }}>
        <Typography {...typographyProps} sx={typographySx}>
          {children}
        </Typography>

        <Box
          sx={{
            visibility: "hidden",
            position: "absolute",
            pointerEvents: "none",
            zIndex: -1,
            left: 0,
            right: 0,
            width: "100%",
            display: "block",
          }}
        >
          <Typography
            {...typographyProps}
            ref={hiddenTypographyRef}
            aria-hidden
            sx={hiddenTypographySx}
          >
            {children}
          </Typography>
        </Box>
      </Box>
      {isOverflowing ? (
        <Button
          size="small"
          variant="text"
          onClick={toggleExpanded}
          sx={{ mt: 0.5, px: 0 }}
        >
          {expanded ? lessLabel : moreLabel}
        </Button>
      ) : null}
    </Box>
  );
}
