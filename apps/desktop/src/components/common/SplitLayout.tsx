import React, { useEffect, useState } from "react";
import { Box } from "@mui/material";

export type SplitLayoutProps = {
  weights: number[];
  children: React.ReactNode;
};

export const SplitLayout = ({ weights, children }: SplitLayoutProps) => {
  const childArr = React.Children.toArray(children);
  const total = weights.reduce((sum, w) => (w > 0 ? sum + w : sum), 0);

  const [mounted, setMounted] = useState<boolean[]>(weights.map((w) => w > 0));

  useEffect(() => {
    setMounted((prev) => weights.map((w, i) => (w > 0 ? true : prev[i])));
  }, [weights]);

  const handleCollapseDone = (i: number) =>
    setMounted((prev) => prev.map((v, idx) => (idx === i ? false : v)));

  if (total === 0) return null;

  return (
    <Box
      sx={{
        display: "flex",
        width: "100%",
        height: "100%",
        flexGrow: 1,
        flexDirection: "row",
        alignItems: "stretch",
      }}
    >
      {childArr.map((child, i) => {
        const w = weights[i] ?? 0;
        const pct = w > 0 ? (w / total) * 100 : 0;

        return (
          <Box
            key={i}
            sx={{
              width: `${pct}%`,
              minWidth: 0,
              overflow: "hidden",
              display: "flex",
              flexDirection: "column",
              transition: "width 300ms ease",
            }}
            onTransitionEnd={(e) => {
              if (
                e.propertyName === "width" &&
                w === 0 &&
                (e.target as HTMLElement).getBoundingClientRect().width === 0
              ) {
                handleCollapseDone(i);
              }
            }}
          >
            {mounted[i] && child}
          </Box>
        );
      })}
    </Box>
  );
};
