import { ArrowForward } from "@mui/icons-material";
import { Button, Stack, Typography } from "@mui/material";
import { FormattedMessage } from "react-intl";
import { showConfetti, showErrorSnackbar } from "../../actions/app.actions";
import { finishTutorial } from "../../actions/user.actions";
import { produceAppState, useAppStore } from "../../store";

const PAGE_COUNT = 2;

export type TutorialWrapperProps = {
  title?: React.ReactNode;
  subtitle?: React.ReactNode;
  children: React.ReactNode;
  nextEnabled?: boolean;
};

export const TutorialWrapper = ({
  title,
  subtitle,
  children,
  nextEnabled,
}: TutorialWrapperProps) => {
  const index = useAppStore((state) => state.tutorial.pageIndex);
  const canNext = index < PAGE_COUNT - 1;
  const canPrevious = index > 0;

  const handleFinish = async () => {
    try {
      await finishTutorial();
      showConfetti();
    } catch (err) {
      showErrorSnackbar(err);
    }
  };

  return (
    <Stack spacing={2}>
      {(title || subtitle) && (
        <Stack spacing={0.5}>
          {title && (
            <Typography variant="h6" fontWeight={600}>
              {title}
            </Typography>
          )}
          {subtitle && (
            <Typography variant="body2" color="text.secondary">
              {subtitle}
            </Typography>
          )}
        </Stack>
      )}
      {children}
      <Stack direction="row" justifyContent="space-between">
        {canPrevious ? (
          <Button
            onClick={() => {
              produceAppState((draft) => {
                draft.tutorial.pageIndex = Math.max(
                  0,
                  draft.tutorial.pageIndex - 1,
                );
              });
            }}
          >
            <FormattedMessage defaultMessage="Back" />
          </Button>
        ) : (
          <div />
        )}
        {canNext ? (
          <Button
            variant="contained"
            disabled={nextEnabled === false}
            endIcon={<ArrowForward />}
            onClick={() => {
              produceAppState((draft) => {
                draft.tutorial.pageIndex = Math.min(
                  PAGE_COUNT,
                  draft.tutorial.pageIndex + 1,
                );
              });
            }}
          >
            <FormattedMessage defaultMessage="Next" />
          </Button>
        ) : (
          <Button variant="contained" onClick={handleFinish}>
            <FormattedMessage defaultMessage="Finish" />
          </Button>
        )}
      </Stack>
    </Stack>
  );
};
