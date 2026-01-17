import { ArrowBack } from "@mui/icons-material";
import { Box, Button, Stack, SxProps, useColorScheme } from "@mui/material";
import { FormattedMessage } from "react-intl";
import { useNavigate } from "react-router-dom";
import { goBackOnboardingPage } from "../../actions/onboarding.actions";
import { getAppState } from "../../store";

export const BackButton = () => {
  const navigate = useNavigate();

  const handleClick = () => {
    const state = getAppState();
    const stack = state.onboarding.history;
    if (stack.length === 0) {
      navigate(-1);
    } else {
      goBackOnboardingPage();
    }
  };

  return (
    <Button
      onClick={handleClick}
      startIcon={<ArrowBack />}
      sx={{ color: "text.disabled", fontWeight: 400 }}
    >
      <FormattedMessage defaultMessage="Back" />
    </Button>
  );
};

export type OnboardingFormLayoutProps = {
  back?: React.ReactNode;
  children?: React.ReactNode;
  actions?: React.ReactNode;
};

export const OnboardingFormLayout = ({
  back,
  children,
  actions,
}: OnboardingFormLayoutProps) => {
  return (
    <Stack
      sx={{
        flex: 1,
        minHeight: 0,
      }}
    >
      <Box
        sx={{
          flexShrink: 0,
          position: "relative",
          zIndex: 1,
          "&::after": {
            content: '""',
            position: "absolute",
            left: 0,
            right: 0,
            bottom: -16,
            height: 16,
            background: (theme) =>
              `linear-gradient(to bottom, ${theme.vars?.palette.background.default}, transparent)`,
            pointerEvents: "none",
          },
        }}
      >
        {back}
      </Box>
      <Box
        sx={{
          flex: 1,
          minHeight: 0,
          overflowY: "auto",
          scrollbarGutter: "stable",
          display: "flex",
          flexDirection: "column",
          py: 2,
        }}
      >
        <Box sx={{ my: "auto" }}>{children}</Box>
      </Box>
      <Box
        sx={{
          flexShrink: 0,
          display: "flex",
          justifyContent: "flex-end",
          position: "relative",
          zIndex: 1,
          "&::before": {
            content: '""',
            position: "absolute",
            left: 0,
            right: 0,
            top: -16,
            height: 16,
            background: (theme) =>
              `linear-gradient(to top, ${theme.vars?.palette.background.default}, transparent)`,
            pointerEvents: "none",
          },
        }}
      >
        {actions}
      </Box>
    </Stack>
  );
};

export type DualPaneLayoutProps = {
  left?: React.ReactNode;
  right?: React.ReactNode;
  rightSx?: SxProps;
  flex?: [number, number];
};

export const DualPaneLayout = ({
  left,
  right,
  rightSx,
  flex = [1, 1],
}: DualPaneLayoutProps) => {
  const { mode, systemMode } = useColorScheme();
  const isDarkTheme =
    mode === "dark" || (mode === "system" && systemMode === "dark");

  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "row",
        alignItems: "stretch",
        gap: 5,
        width: "100%",
        height: "100%",
        p: 5,
        pt: 2,
      }}
    >
      {left && (
        <Box
          sx={{
            flex: flex[0],
            display: "flex",
            flexDirection: "column",
            minHeight: 0,
            minWidth: 0,
          }}
        >
          {left}
        </Box>
      )}

      {right && (
        <Box
          sx={{
            flex: flex[1],
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            borderRadius: 4,
            bgcolor: "level1",
            minWidth: 0,
            minHeight: 0,
            overflow: "hidden",
            p: 1,
            "& img": {
              maxWidth: "100%",
              maxHeight: "100%",
              objectFit: "contain",
              filter: isDarkTheme ? "invert(1) hue-rotate(185deg)" : "none",
            },
            ...rightSx,
          }}
        >
          {right}
        </Box>
      )}
    </Box>
  );
};
