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
import { useCallback, useEffect, useRef, type ReactNode } from "react";
import { FormattedMessage } from "react-intl";

const COLLAPSE_DISTANCE_PX = 96;
const TITLE_FONT_SIZE_EXPANDED = 34;
const TITLE_FONT_SIZE_COLLAPSED = 22;
const TITLE_SCALE_RANGE =
  TITLE_FONT_SIZE_EXPANDED / TITLE_FONT_SIZE_COLLAPSED - 1;

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

  useEffect(() => {
    const scroller = scrollerRef.current;
    if (!scroller) return;

    let rafId: number | null = null;

    const handleScroll = () => {
      if (rafId !== null) return;
      rafId = requestAnimationFrame(() => {
        const p = Math.min(scroller.scrollTop / COLLAPSE_DISTANCE_PX, 1);
        scroller.style.setProperty("--p", `${p}`);
        rafId = null;
      });
    };

    scroller.style.setProperty("--p", "0");
    scroller.addEventListener("scroll", handleScroll, { passive: true });

    return () => {
      scroller.removeEventListener("scroll", handleScroll);
      if (rafId !== null) cancelAnimationFrame(rafId);
    };
  }, []);

  const handleLoadMore = useCallback(() => {
    onLoadMore?.();
  }, [onLoadMore]);

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
      {items.length === 0 ? (
        <>
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
              sx={{ pt: 1, pb: 4, position: "relative" }}
            >
              <Stack spacing={2}>
                <Stack
                  direction="row"
                  spacing={2}
                  alignItems="flex-start"
                  justifyContent="space-between"
                >
                  <Typography
                    variant="h4"
                    fontWeight={700}
                    sx={(theme) => ({
                      fontSize: theme.typography.pxToRem(
                        TITLE_FONT_SIZE_EXPANDED,
                      ),
                      lineHeight: theme.typography.pxToRem(
                        TITLE_FONT_SIZE_EXPANDED * 1.15,
                      ),
                    })}
                  >
                    {title}
                  </Typography>
                  {action}
                </Stack>
                {subtitle ? (
                  <Typography
                    variant="subtitle1"
                    color="text.secondary"
                    sx={{
                      position: "absolute",
                      bottom: 0,
                      transform: "translateY(4px)",
                    }}
                  >
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
            flex: 1,
            overflowY: "auto",
            overflowX: "hidden",
            overscrollBehavior: "contain",
          }}
        >
          <Box
            sx={(theme) => ({
              pr: 2,
              backdropFilter: "blur(8px)",
              position: "sticky",
              top: 0,
              zIndex: theme.zIndex.appBar,
              overflow: "visible",
            })}
          >
            <Container
              maxWidth={headerMaxWidth}
              sx={{ pt: 1, pb: 1, position: "relative" }}
            >
              <Stack
                direction="row"
                spacing={2}
                alignItems="flex-start"
                justifyContent="space-between"
              >
                <Typography
                  variant="h4"
                  fontWeight={700}
                  sx={{
                    fontSize: TITLE_FONT_SIZE_COLLAPSED,
                    lineHeight: `${TITLE_FONT_SIZE_COLLAPSED * 1.15}px`,
                    transformOrigin: "top left",
                    transform: `scale(calc(1 + ${TITLE_SCALE_RANGE} * (1 - var(--p, 0))))`,
                    willChange: "transform",
                  }}
                >
                  {title}
                </Typography>
                {action}
              </Stack>
              {subtitle ? (
                <Box sx={{ height: 0, overflow: "visible" }}>
                  <Typography
                    variant="subtitle1"
                    color="text.secondary"
                    sx={{
                      opacity: "clamp(0, calc(1 - var(--p, 0) * 2), 1)",
                      transform:
                        "translateY(calc(4px * clamp(0, calc(1 - var(--p, 0) * 2), 1)))",
                      willChange: "opacity, transform",
                    }}
                  >
                    {subtitle}
                  </Typography>
                </Box>
              ) : null}
            </Container>
          </Box>
          <Box sx={{ height: COLLAPSE_DISTANCE_PX }} />
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
    </Box>
  );
}
