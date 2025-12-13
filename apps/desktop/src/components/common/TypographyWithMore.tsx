import { Box, Button, Typography, type TypographyProps } from "@mui/material";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { FormattedMessage } from "react-intl";

type TypographyWithMoreProps = TypographyProps & {
  maxLines?: number;
  initiallyExpanded?: boolean;
  moreLabel?: React.ReactNode;
  lessLabel?: React.ReactNode;
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
  sx: TypographyProps["sx"],
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
  moreLabel = <FormattedMessage defaultMessage="Show more" />,
  lessLabel = <FormattedMessage defaultMessage="Show less" />,
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

  const typographySx = useMemo(() => {
    const normalized = normalizeSxProp(clampStyles, shouldClamp, sx);

    if (!shouldClamp) {
      return normalized;
    }

    const paddingAdjustment = { pr: 6 } as const;

    if (Array.isArray(normalized)) {
      return [...normalized, paddingAdjustment];
    }

    if (normalized) {
      return [normalized, paddingAdjustment];
    }

    return paddingAdjustment;
  }, [clampStyles, shouldClamp, sx]);
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

  const renderToggleButton = (inline: boolean) => (
    <Button
      size="small"
      variant="text"
      onClick={toggleExpanded}
      sx={(theme) => {
        const variantKey = typographyProps.variant ?? "body2";
        const variantStyles =
          (theme.typography as Record<string, any>)[variantKey] ??
          theme.typography.body2;
        const fontSize =
          typeof typographyProps.fontSize !== "undefined"
            ? typographyProps.fontSize
            : variantStyles.fontSize;
        const lineHeight =
          typeof typographyProps.lineHeight !== "undefined"
            ? typographyProps.lineHeight
            : (variantStyles.lineHeight ?? 1.35);

        return {
          px: 0,
          minWidth: 0,
          fontSize,
          lineHeight,
          textTransform: "none",
          color: theme.vars?.palette.text.primary ?? theme.palette.text.primary,
          ...(inline
            ? {
                position: "absolute" as const,
                right: 0,
                bottom: 0,
                mt: 0,
                py: 0,
                borderRadius: 999,
                backgroundColor:
                  theme.vars?.palette.level0 ?? theme.palette.background.paper,
                boxShadow: `-12px 0 12px ${
                  theme.vars?.palette.level0 ?? theme.palette.background.paper
                }`,
              }
            : {
                mt: 0.5,
                display: "block",
                ml: "auto",
              }),
        };
      }}
    >
      {expanded ? lessLabel : moreLabel}
    </Button>
  );

  return (
    <Box>
      <Box ref={containerRef} sx={{ position: "relative" }}>
        <Typography {...typographyProps} sx={typographySx}>
          {children}
        </Typography>

        {isOverflowing && shouldClamp ? renderToggleButton(true) : null}

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
      {isOverflowing && !shouldClamp ? renderToggleButton(false) : null}
    </Box>
  );
}
