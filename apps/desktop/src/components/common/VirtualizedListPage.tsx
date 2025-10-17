import { lerp } from "@repo/utilities";
import {
  Box,
  Container,
  Stack,
  Typography,
  type ContainerProps,
  type SxProps,
  type Theme,
} from "@mui/material";
import { useCallback, useEffect, useState, type ReactNode } from "react";
import { Virtuoso, type VirtuosoProps } from "react-virtuoso";

const COLLAPSE_DISTANCE_PX = 96;
const TITLE_FONT_SIZE_EXPANDED = 34;
const TITLE_FONT_SIZE_COLLAPSED = 22;

export type VirtualizedListPageProps<Item> = {
  title: string;
  subtitle?: ReactNode;
  items: readonly Item[];
  renderItem: (item: Item, index: number) => ReactNode;
  computeItemKey?: (item: Item, index: number) => string | number;
  headerMaxWidth?: ContainerProps["maxWidth"];
  contentMaxWidth?: ContainerProps["maxWidth"];
  itemWrapperSx?: SxProps<Theme>;
  itemContainerSx?: SxProps<Theme>;
  virtuosoProps?: Omit<
    VirtuosoProps<Item, unknown>,
    "data" | "itemContent" | "components" | "scrollerRef" | "style" | "computeItemKey"
  >;
};

export function VirtualizedListPage<Item>({
  title,
  subtitle,
  items,
  renderItem,
  computeItemKey,
  headerMaxWidth = "sm",
  contentMaxWidth = "sm",
  itemWrapperSx,
  itemContainerSx,
  virtuosoProps,
}: VirtualizedListPageProps<Item>) {
  const [scrollerNode, setScrollerNode] = useState<HTMLElement | Window | null>(null);
  const [collapseProgress, setCollapseProgress] = useState(0);

  useEffect(() => {
    if (!scrollerNode || scrollerNode instanceof Window) {
      return;
    }

    let rafId: number | null = null;

    const handleScroll = () => {
      if (rafId !== null) {
        return;
      }

      rafId = requestAnimationFrame(() => {
        const progress = Math.min(scrollerNode.scrollTop / COLLAPSE_DISTANCE_PX, 1);
        setCollapseProgress(progress);
        rafId = null;
      });
    };

    handleScroll();
    scrollerNode.addEventListener("scroll", handleScroll, { passive: true });

    return () => {
      scrollerNode.removeEventListener("scroll", handleScroll);
      if (rafId !== null) {
        cancelAnimationFrame(rafId);
      }
    };
  }, [scrollerNode]);

  const handleScrollerRef = useCallback((node: HTMLElement | Window | null) => {
    setScrollerNode(node);
  }, []);

  const headerPaddingTop = 1 - collapseProgress;
  const headerPaddingBottom = 2 + (1 - collapseProgress) * 3;
  const headerGap = 1 + (1 - collapseProgress);
  const titleFontSizePx =
    TITLE_FONT_SIZE_EXPANDED -
    (TITLE_FONT_SIZE_EXPANDED - TITLE_FONT_SIZE_COLLAPSED) * collapseProgress;
  const subtitleOpacity = Math.min(lerp(0, 1, 1 - collapseProgress * 2), 1);
  const headerShrinkAmount = COLLAPSE_DISTANCE_PX * (1 - collapseProgress);
  const itemWrapperStyles: SxProps<Theme> = itemWrapperSx
    ? ([{ py: 2 }, itemWrapperSx] as SxProps<Theme>)
    : { py: 2 };

  return (
    <Box
      sx={{
        flexGrow: 1,
        display: "flex",
        flexDirection: "column",
        height: "100%",
        overflow: "hidden",
      }}
    >
      <Box
        sx={(theme) => ({
          pr: 2,
          backdropFilter: "blur(8px)",
          position: "sticky",
          top: 0,
          zIndex: theme.zIndex.appBar,
        })}
      >
        <Container
          maxWidth={headerMaxWidth}
          sx={{
            pt: headerPaddingTop,
            pb: headerPaddingBottom,
            position: "relative",
          }}
        >
          <Stack spacing={headerGap}>
            <Typography
              variant="h4"
              fontWeight={700}
              sx={(theme) => ({
                fontSize: theme.typography.pxToRem(titleFontSizePx),
                lineHeight: theme.typography.pxToRem(titleFontSizePx * 1.15),
              })}
            >
              {title}
            </Typography>
            {subtitle ? (
              <Typography
                variant="subtitle1"
                color="text.secondary"
                sx={{
                  opacity: subtitleOpacity,
                  position: "absolute",
                  bottom: 0,
                  transform: `translateY(${subtitleOpacity * 4}px)`,
                }}
              >
                {subtitle}
              </Typography>
            ) : null}
          </Stack>
        </Container>
      </Box>
      <Virtuoso
        data={items}
        style={{ flex: 1 }}
        scrollerRef={handleScrollerRef}
        computeItemKey={
          computeItemKey
            ? (index, item) => computeItemKey(item, index)
            : undefined
        }
        components={{
          Header: () => <Box sx={{ height: headerShrinkAmount / 2 }} />,
        }}
        itemContent={(index, item) => (
          <Container maxWidth={contentMaxWidth} sx={itemContainerSx}>
            <Box sx={itemWrapperStyles}>{renderItem(item, index)}</Box>
          </Container>
        )}
        {...(virtuosoProps ?? {})}
      />
    </Box>
  );
}
