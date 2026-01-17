import { ArrowBack } from "@mui/icons-material";
import { Box, Button, Stack } from "@mui/material";
import { FormattedMessage } from "react-intl";
import { useNavigate } from "react-router-dom";
import { goBackOnboardingPage } from "../../actions/onboarding.actions";
import { getAppState } from "../../store";

export const BackButton = () => {
  const navigate = useNavigate();

  const handleClick = () => {
    const state = getAppState();
    const stack = state.onboarding.history;
    if (stack.length <= 1) {
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
        gap: 2,
      }}
    >
      <Box>{back}</Box>
      <Box sx={{ height: 16, flex: 1 }} />
      <Box
        sx={{
          display: "flex",
          flex: 1,
          flexDirection: "column",
          alignItems: "stretch",
          justifyContent: "center",
        }}
      >
        {children}
      </Box>
      <Box sx={{ height: 16, flex: 2 }} />
      <Box sx={{ display: "flex", justifyContent: "flex-end" }}>{actions}</Box>
    </Stack>
  );
};

export type DualPaneLayoutProps = {
  left?: React.ReactNode;
  right?: React.ReactNode;
  flex?: [number, number];
};

export const DualPaneLayout = ({
  left,
  right,
  flex = [1, 1],
}: DualPaneLayoutProps) => {
  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "row",
        alignItems: "stretch",
        gap: 4,
        width: "100%",
        height: "100%",
        p: 4,
        pt: 2,
      }}
    >
      {left && (
        <Box
          sx={{
            flex: flex[0],
            display: "flex",
            flexDirection: "column",
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
            flexDirection: "column",
            borderRadius: 2,
            bgcolor: "level1",
          }}
        >
          {right}
        </Box>
      )}
    </Box>
  );
};
