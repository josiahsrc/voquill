import {
  Box,
  Button,
  Container,
  Stack,
  Typography,
  type ContainerProps,
  type SxProps,
  type Theme,
} from "@mui/material";
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { FormattedMessage } from "react-intl";

export type ScrollListPageProps<Item> = {
  title: ReactNode;
  action?: ReactNode;
  subtitle?: ReactNode;
  items: readonly Item[];
  renderItem: (item: Item, index: number) => ReactNode;
  computeItemKey?: (item: Item, index: number) => string | number;
  headerMaxWidth?: ContainerProps["maxWidth"];
  contentMaxWidth?: ContainerProps["maxWidth"];
  itemWrapperSx?: SxProps<Theme>;
  itemContainerSx?: SxProps<Theme>;
  emptyState?: ReactNode;
  hasMore?: boolean;
  onLoadMore?: () => void;
};

export function ScrollListPage<Item>({
  title,
  action,
  subtitle,
  items,
  renderItem,
  computeItemKey,
  headerMaxWidth = "sm",
  contentMaxWidth = "sm",
  itemWrapperSx,
  itemContainerSx,
  emptyState,
  hasMore,
  onLoadMore,
}: ScrollListPageProps<Item>) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const expandedHeaderMeasureRef = useRef<HTMLDivElement>(null);
  const collapsedHeaderMeasureRef = useRef<HTMLDivElement>(null);
  const expandedTitleMeasureRef = useRef<HTMLSpanElement>(null);
  const collapsedTitleMeasureRef = useRef<HTMLSpanElement>(null);
  const collapseDistanceRef = useRef(0);
  const [headerMetrics, setHeaderMetrics] = useState({
    collapsedHeight: 0,
    collapseDistance: 0,
    collapsedTitleHeight: 0,
    titleHeightDelta: 0,
    titleScale: 1,
  });

  useLayoutEffect(() => {
    const scroller = scrollerRef.current;
    const expandedHeader = expandedHeaderMeasureRef.current;
    const collapsedHeader = collapsedHeaderMeasureRef.current;
    const expandedTitle = expandedTitleMeasureRef.current;
    const collapsedTitle = collapsedTitleMeasureRef.current;
    if (
      !scroller ||
      !expandedHeader ||
      !collapsedHeader ||
      !expandedTitle ||
      !collapsedTitle
    ) {
      return;
    }

    let frameId: number | null = null;

    const updateLayout = () => {
      frameId = null;

      const expandedHeaderHeight =
        expandedHeader.getBoundingClientRect().height;
      const collapsedHeaderHeight =
        collapsedHeader.getBoundingClientRect().height;
      const expandedTitleHeight = expandedTitle.getBoundingClientRect().height;
      const collapsedTitleHeight =
        collapsedTitle.getBoundingClientRect().height;
      const collapseDistance = Math.max(
        expandedHeaderHeight - collapsedHeaderHeight,
        0,
      );
      const titleScale =
        collapsedTitleHeight > 0
          ? expandedTitleHeight / collapsedTitleHeight
          : 1;
      const titleHeightDelta = Math.max(
        expandedTitleHeight - collapsedTitleHeight,
        0,
      );
      const progress =
        collapseDistance > 0
          ? Math.min(scroller.scrollTop / collapseDistance, 1)
          : 1;

      collapseDistanceRef.current = collapseDistance;
      scroller.style.setProperty("--p", `${progress}`);

      setHeaderMetrics((current) => {
        if (
          current.collapsedHeight === collapsedHeaderHeight &&
          current.collapseDistance === collapseDistance &&
          current.collapsedTitleHeight === collapsedTitleHeight &&
          current.titleHeightDelta === titleHeightDelta &&
          current.titleScale === titleScale
        ) {
          return current;
        }

        return {
          collapsedHeight: collapsedHeaderHeight,
          collapseDistance,
          collapsedTitleHeight,
          titleHeightDelta,
          titleScale,
        };
      });
    };

    const scheduleUpdate = () => {
      if (frameId !== null) {
        return;
      }

      frameId = requestAnimationFrame(updateLayout);
    };

    scheduleUpdate();

    if (typeof ResizeObserver === "undefined") {
      return () => {
        if (frameId !== null) {
          cancelAnimationFrame(frameId);
        }
      };
    }

    const observer = new ResizeObserver(scheduleUpdate);
    observer.observe(scroller);
    observer.observe(expandedHeader);
    observer.observe(collapsedHeader);
    observer.observe(expandedTitle);
    observer.observe(collapsedTitle);

    return () => {
      observer.disconnect();
      if (frameId !== null) {
        cancelAnimationFrame(frameId);
      }
    };
  }, [action, headerMaxWidth, items.length, subtitle, title]);

  useEffect(() => {
    const scroller = scrollerRef.current;
    if (!scroller) return;

    let rafId: number | null = null;

    const handleScroll = () => {
      if (rafId !== null) return;
      rafId = requestAnimationFrame(() => {
        const collapseDistance = collapseDistanceRef.current;
        const p =
          collapseDistance > 0
            ? Math.min(scroller.scrollTop / collapseDistance, 1)
            : 1;
        scroller.style.setProperty("--p", `${p}`);
        rafId = null;
      });
    };

    const collapseDistance = collapseDistanceRef.current;
    const progress =
      collapseDistance > 0
        ? Math.min(scroller.scrollTop / collapseDistance, 1)
        : 1;
    scroller.style.setProperty("--p", `${progress}`);
    scroller.addEventListener("scroll", handleScroll, { passive: true });

    return () => {
      scroller.removeEventListener("scroll", handleScroll);
      if (rafId !== null) cancelAnimationFrame(rafId);
    };
  }, [items.length]);

  const handleLoadMore = useCallback(() => {
    onLoadMore?.();
  }, [onLoadMore]);
  const titleScaleRange = Math.max(headerMetrics.titleScale - 1, 0);
  const headerHeight =
    headerMetrics.collapseDistance > 0 || headerMetrics.collapsedHeight > 0
      ? `calc(${headerMetrics.collapsedHeight}px + ${headerMetrics.collapseDistance}px * (1 - var(--p, 0)))`
      : undefined;
  const titleHeight =
    headerMetrics.titleHeightDelta > 0 || headerMetrics.collapsedTitleHeight > 0
      ? `calc(${headerMetrics.collapsedTitleHeight}px + ${headerMetrics.titleHeightDelta}px * (1 - var(--p, 0)))`
      : undefined;

  return (
    <Box
      sx={{
        position: "relative",
        flexGrow: 1,
        display: "flex",
        flexDirection: "column",
        height: "100%",
        overflow: "hidden",
      }}
    >
      {items.length === 0 ? (
        <>
          <Box
            sx={(theme) => ({
              pr: 2,
              backgroundColor:
                theme.vars?.palette.background.default ??
                theme.palette.background.default,
              position: "sticky",
              top: 0,
              zIndex: theme.zIndex.appBar,
            })}
          >
            <Container maxWidth={headerMaxWidth} sx={{ pt: 1, pb: 4 }}>
              <Stack spacing={1.5}>
                <Stack
                  direction="row"
                  spacing={2}
                  alignItems="flex-start"
                  justifyContent="space-between"
                >
                  <Typography variant="h4" fontWeight={700}>
                    {title}
                  </Typography>
                  {action}
                </Stack>
                {subtitle ? (
                  <Typography variant="subtitle1" color="text.secondary">
                    {subtitle}
                  </Typography>
                ) : null}
              </Stack>
            </Container>
          </Box>
          <Box
            sx={{
              flex: 1,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              overflow: "auto",
            }}
          >
            <Container maxWidth={contentMaxWidth} sx={{ pb: 8 }}>
              {emptyState || (
                <Stack spacing={1} alignItems="center">
                  <Typography variant="h6" color="text.secondary">
                    It's quiet in here
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    There are no items to display.
                  </Typography>
                </Stack>
              )}
            </Container>
          </Box>
        </>
      ) : (
        <Box
          ref={scrollerRef}
          sx={{
            "--p": 0,
            flex: 1,
            overflowY: "auto",
            overflowX: "hidden",
            overscrollBehavior: "contain",
          }}
        >
          <Box
            sx={(theme) => ({
              pr: 2,
              backgroundColor:
                theme.vars?.palette.background.default ??
                theme.palette.background.default,
              position: "sticky",
              top: 0,
              zIndex: theme.zIndex.appBar,
              height: headerHeight,
              overflow: "hidden",
            })}
          >
            <Container maxWidth={headerMaxWidth} sx={{ pt: 1, pb: 4 }}>
              <Stack spacing={1.5}>
                <Stack
                  direction="row"
                  spacing={2}
                  alignItems="flex-start"
                  justifyContent="space-between"
                >
                  <Box sx={{ height: titleHeight, flex: 1, minWidth: 0 }}>
                    <Typography
                      component="span"
                      variant="h5"
                      fontWeight={700}
                      sx={{
                        display: "block",
                        transformOrigin: "top left",
                        transform: `scale(calc(1 + ${titleScaleRange} * (1 - var(--p, 0))))`,
                        willChange: "transform",
                      }}
                    >
                      {title}
                    </Typography>
                  </Box>
                  {action}
                </Stack>
                {subtitle ? (
                  <Typography
                    variant="subtitle1"
                    color="text.secondary"
                    sx={{
                      opacity: "clamp(0, calc(1 - var(--p, 0) * 2), 1)",
                      transformOrigin: "top left",
                      transform:
                        "scale(calc(1 - 0.1 * var(--p, 0))) translateY(calc(-4px * var(--p, 0)))",
                      willChange: "opacity, transform",
                    }}
                  >
                    {subtitle}
                  </Typography>
                ) : null}
              </Stack>
            </Container>
          </Box>
          {items.map((item, index) => (
            <Container
              key={computeItemKey ? computeItemKey(item, index) : index}
              maxWidth={contentMaxWidth}
              sx={itemContainerSx}
            >
              <Box sx={itemWrapperSx}>{renderItem(item, index)}</Box>
            </Container>
          ))}
          {hasMore && (
            <Container maxWidth={contentMaxWidth}>
              <Box sx={{ display: "flex", justifyContent: "center", py: 3 }}>
                <Button variant="text" onClick={handleLoadMore}>
                  <FormattedMessage defaultMessage="Show more" />
                </Button>
              </Box>
            </Container>
          )}
          <Box sx={{ height: 32 }} />
        </Box>
      )}
      {items.length > 0 ? (
        <Box
          aria-hidden
          sx={{
            position: "absolute",
            top: 0,
            left: 0,
            width: "100%",
            visibility: "hidden",
            pointerEvents: "none",
            overflow: "hidden",
          }}
        >
          <Container
            maxWidth={headerMaxWidth}
            ref={expandedHeaderMeasureRef}
            sx={{ pt: 1, pb: 4 }}
          >
            <Stack spacing={1.5}>
              <Stack
                direction="row"
                spacing={2}
                alignItems="flex-start"
                justifyContent="space-between"
              >
                <Typography
                  component="span"
                  ref={expandedTitleMeasureRef}
                  variant="h4"
                  fontWeight={700}
                  sx={{ display: "block" }}
                >
                  {title}
                </Typography>
                {action}
              </Stack>
              {subtitle ? (
                <Typography variant="subtitle1" color="text.secondary">
                  {subtitle}
                </Typography>
              ) : null}
            </Stack>
          </Container>
          <Container
            maxWidth={headerMaxWidth}
            ref={collapsedHeaderMeasureRef}
            sx={{ pt: 1, pb: 1 }}
          >
            <Stack
              direction="row"
              spacing={2}
              alignItems="flex-start"
              justifyContent="space-between"
            >
              <Typography
                component="span"
                ref={collapsedTitleMeasureRef}
                variant="h5"
                fontWeight={700}
                sx={{ display: "block" }}
              >
                {title}
              </Typography>
              {action}
            </Stack>
          </Container>
        </Box>
      ) : null}
    </Box>
  );
}
