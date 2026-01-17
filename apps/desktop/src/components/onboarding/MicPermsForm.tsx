import { ArrowForward, Check, OpenInNew } from "@mui/icons-material";
import { Box, Button, Stack, Typography } from "@mui/material";
import { useCallback, useState } from "react";
import { FormattedMessage } from "react-intl";
import { goToOnboardingPage } from "../../actions/onboarding.actions";
import { produceAppState, useAppStore } from "../../store";
import {
  isPermissionAuthorized,
  requestMicrophonePermission,
} from "../../utils/permission.utils";
import {
  BackButton,
  DualPaneLayout,
  OnboardingFormLayout,
} from "./OnboardingCommon";

export const MicPermsForm = () => {
  const [requesting, setRequesting] = useState(false);
  const micPermission = useAppStore((state) => state.permissions.microphone);
  const isAuthorized = isPermissionAuthorized(micPermission?.state);

  const handleAllow = useCallback(async () => {
    if (requesting || isAuthorized) {
      return;
    }

    setRequesting(true);
    try {
      const result = await requestMicrophonePermission();
      produceAppState((draft) => {
        draft.permissions.microphone = result;
      });
    } catch (error) {
      console.error("Failed to request microphone permission", error);
    } finally {
      setRequesting(false);
    }
  }, [requesting, isAuthorized]);

  const handleContinue = () => {
    goToOnboardingPage("a11yPerms");
  };

  const form = (
    <OnboardingFormLayout
      back={<BackButton />}
      actions={
        <Button
          variant="contained"
          endIcon={<ArrowForward />}
          onClick={handleContinue}
          disabled={!isAuthorized}
        >
          <FormattedMessage defaultMessage="Continue" />
        </Button>
      }
    >
      <Stack spacing={3}>
        <Box>
          <Typography variant="h4" fontWeight={600} pb={1}>
            <FormattedMessage defaultMessage="Set up your microphone" />
          </Typography>
          <Typography variant="body1" color="text.secondary">
            <FormattedMessage defaultMessage="Voquill only activates your microphone when you choose to start recording." />
          </Typography>
        </Box>

        {isAuthorized ? (
          <Button
            variant="outlined"
            color="success"
            startIcon={<Check />}
            disabled
            sx={{ alignSelf: "flex-start" }}
          >
            <FormattedMessage defaultMessage="Access granted" />
          </Button>
        ) : (
          <Button
            variant="outlined"
            onClick={() => void handleAllow()}
            disabled={requesting}
            endIcon={<OpenInNew />}
            sx={{ alignSelf: "flex-start" }}
          >
            <FormattedMessage defaultMessage="Allow access" />
          </Button>
        )}
      </Stack>
    </OnboardingFormLayout>
  );

  const rightContent = (
    <Box
      sx={{
        borderRadius: "24px",
        border: "1px solid gray",
        overflow: "hidden",
        maxHeight: "100%",
        margin: 8,
      }}
    >
      <Box
        component="video"
        src="/src/assets/enable-mic.mp4"
        autoPlay
        loop
        muted
        playsInline
        sx={{
          display: "block",
          margin: "-10px",
          width: "auto",
          height: "auto",
          maxWidth: "calc(100% + 20px)",
          maxHeight: "calc(100% + 20px)",
        }}
      />
    </Box>
  );

  return (
    <DualPaneLayout
      left={form}
      right={rightContent}
      rightSx={{
        bgcolor: "transparent",
      }}
    />
  );
};
