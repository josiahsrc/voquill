import { Tooltip, Typography } from "@mui/material";
import { Box, type SxProps } from "@mui/system";
import { forwardRef, useEffect, useRef, useState } from "react";

type OverflowTypographyProps = Omit<
  React.ComponentProps<typeof Typography>,
  "noWrap" | "classes" | "sx"
> & {
  maxRows?: number;
  sx?: SxProps;
};

export const OverflowTypography = forwardRef<
  HTMLDivElement,
  OverflowTypographyProps
>(({ maxRows = 1, sx, ...rest }, ref) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const textRef = useRef<HTMLDivElement>(null);
  const [isOverflow, setIsOverflow] = useState(false);

  const getOverflow = () => {
    if (!containerRef.current || !textRef.current) return false;

    const containerHeight = containerRef.current.offsetHeight;
    const textHeight = textRef.current.offsetHeight;

    const containterWidth = containerRef.current.offsetWidth;
    const textWidth = textRef.current.offsetWidth;
    return textHeight > containerHeight || textWidth > containterWidth;
  };

  useEffect(() => {
    const containerResizeObserver = new ResizeObserver(() =>
      setIsOverflow(getOverflow()),
    );
    const textResizeObserver = new ResizeObserver(() =>
      setIsOverflow(getOverflow()),
    );

    if (containerRef.current)
      containerResizeObserver.observe(containerRef.current);
    if (textRef.current) textResizeObserver.observe(textRef.current);

    return () => {
      containerResizeObserver.disconnect();
      textResizeObserver.disconnect();
    };
  }, []);

  const textSx: SxProps =
    maxRows > 1
      ? {
          display: "-webkit-box",
          WebkitLineClamp: maxRows,
          WebkitBoxOrient: "vertical",
          textOverflow: "ellipsis",
        }
      : {
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
        };

  return (
    <Tooltip
      title={isOverflow ? rest.children : undefined}
      disableInteractive={true}
      {...rest}
    >
      <Box sx={sx}>
        <Box
          sx={{
            overflow: "hidden",
            position: "relative",
          }}
          ref={containerRef}
        >
          <Box
            sx={{ visibility: "hidden", position: "absolute", top: 0, left: 0 }}
          >
            <Typography {...rest} ref={textRef} />
          </Box>
          <Box sx={{ ...textSx }}>
            <Typography {...rest} ref={ref} sx={textSx} />
          </Box>
        </Box>
      </Box>
    </Tooltip>
  );
});
