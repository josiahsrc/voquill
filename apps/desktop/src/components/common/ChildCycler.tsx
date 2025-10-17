import { Box } from "@mui/material";
import React, {
  type ReactNode,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { useInterval } from "../../hooks/helper.hooks";

export interface ChildCyclerProps {
  interval?: number;
  children: ReactNode;
  transitionDuration?: number;
}

export const ChildCycler = ({
  children,
  interval = 8000,
  transitionDuration = 300,
}: ChildCyclerProps) => {
  const childArray = React.Children.toArray(children);
  const [index, setIndex] = useState(0);
  const [fading, setFading] = useState(false);
  const [dims, setDims] = useState<{ w: number; h: number }>({ w: 0, h: 0 });

  const wrapperRef = useRef<HTMLDivElement>(null);
  const sizerRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const rect = wrapperRef.current?.getBoundingClientRect();
    setDims({ w: rect?.width ?? 0, h: rect?.height ?? 0 });
  }, []);

  useInterval(interval, () => {
    if (childArray.length <= 1) return;
    const nextIdx = (index + 1) % childArray.length;

    if (sizerRef.current) {
      const rect = sizerRef.current.getBoundingClientRect();
      setDims({ w: rect.width, h: rect.height });
    }

    setFading(true);

    setTimeout(() => {
      setIndex(nextIdx);
      setFading(false);
    }, transitionDuration);
  }, [childArray.length, interval, transitionDuration]);

  const nextIndex = (index + 1) % childArray.length;

  return (
    <Box
      sx={{
        position: "relative",
        width: dims.w ? `${dims.w}px` : undefined,
        height: dims.h ? `${dims.h}px` : undefined,
        transition: `width ${transitionDuration}ms ease, height ${transitionDuration}ms ease`,
        overflow: "hidden",
      }}
    >
      <Box
        ref={wrapperRef}
        sx={{
          opacity: fading ? 0 : 1,
          transition: `opacity ${transitionDuration}ms ease`,
        }}
      >
        {childArray[index]}
      </Box>
      <Box
        ref={sizerRef}
        sx={{
          position: "absolute",
          visibility: "hidden",
          top: 0,
          left: 0,
        }}
      >
        {childArray[nextIndex]}
      </Box>
    </Box>
  );
};
