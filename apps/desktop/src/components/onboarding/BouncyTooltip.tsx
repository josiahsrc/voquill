import { Box, keyframes } from "@mui/material";
import { ReactNode, useEffect, useRef } from "react";

const fadeIn = keyframes`
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
`;

const bounce = keyframes`
  0%, 100% {
    transform: translateY(0);
  }
  50% {
    transform: translateY(-8px);
  }
`;

const fadeOutDown = keyframes`
  from {
    opacity: 1;
    transform: translateY(0);
  }
  to {
    opacity: 0;
    transform: translateY(10px);
  }
`;

type BouncyTooltipProps = {
  visible: boolean;
  children: ReactNode;
  align?: "left" | "center" | "right";
  delay?: number;
};

export const BouncyTooltip = ({
  visible,
  children,
  align = "center",
  delay = 0,
}: BouncyTooltipProps) => {
  const hasBeenVisible = useRef(false);

  useEffect(() => {
    if (visible) {
      hasBeenVisible.current = true;
    }
  }, [visible]);

  const getAnimation = () => {
    if (visible) {
      return `${fadeIn} 0.2s ease-out ${delay}s both, ${bounce} 1s ease-in-out ${delay}s infinite`;
    }
    if (hasBeenVisible.current) {
      return `${fadeOutDown} 0.2s ease-in forwards`;
    }
    return "none";
  };

  return (
    <Box
      sx={{
        position: "absolute",
        bottom: 0,
        left: 0,
        right: 0,
        display: "flex",
        justifyContent:
          align === "left"
            ? "flex-start"
            : align === "right"
              ? "flex-end"
              : "center",
        opacity: !visible && !hasBeenVisible.current ? 0 : undefined,
        animation: getAnimation(),
        pointerEvents: visible ? "auto" : "none",
      }}
    >
      <Box
        sx={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          filter: "drop-shadow(0 4px 8px rgba(0, 0, 0, 0.2))",
        }}
      >
        <Box
          sx={{
            width: 0,
            height: 0,
            borderLeft: "8px solid transparent",
            borderRight: "8px solid transparent",
            borderBottom: "8px solid",
            borderBottomColor: "primary.main",
          }}
        />
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            gap: 1,
            bgcolor: "primary.main",
            color: "primary.contrastText",
            px: 2,
            py: 1,
            borderRadius: 1,
          }}
        >
          {children}
        </Box>
      </Box>
    </Box>
  );
};
