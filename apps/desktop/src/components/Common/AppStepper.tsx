import { Check } from "@mui/icons-material";
import {
  Step,
  StepLabel,
  Stepper,
  useTheme,
  type SxProps,
} from "@mui/material";
import { isDefined } from "@repo/utilities";

export type AppStepperStep = {
  label: string;
  icon: React.ReactNode;
};

export type AppStepperProps = {
  index?: number;
  steps?: AppStepperStep[];
  sx?: SxProps;
  readyIndex?: number;
  onStepClick?: (stepIndex: number) => void;
};

export const AppStepper = ({
  index = 0,
  steps = [],
  sx,
  readyIndex,
  onStepClick,
}: AppStepperProps) => {
  const theme = useTheme();

  const pill = {
    backgroundColor: "primary.main",
    px: 3,
    py: 1.5,
  };

  const transition = theme.transitions.create(
    ["background-color", "padding", "font-size", "color", "transform"],
    { duration: theme.transitions.duration.short }
  );

  return (
    <Stepper activeStep={index} orientation="vertical" sx={sx}>
      {steps.map((step, idx) => {
        const completed = idx < index;
        const active = idx === index;
        const clickable =
          onStepClick && (isDefined(readyIndex) ? idx <= readyIndex : true);
        const icon = completed ? <Check /> : step.icon;

        return (
          <Step key={step.label} completed={completed}>
            <StepLabel
              icon={icon}
              sx={{
                borderRadius: "64px",
                display: "flex",
                alignItems: "center",
                opacity: clickable ? 1 : 0.2,
                transition,
                "& .MuiStepLabel-label": {
                  fontSize: 16,
                  transition,
                },
                "& .MuiStepLabel-iconContainer": {
                  mr: 2,
                  transition,
                  "& svg": {
                    fontSize: 22,
                    transition,
                  },
                },
                ...(active && {
                  ...pill,
                  "& .MuiStepLabel-label": {
                    fontSize: 18,
                    fontWeight: 600,
                    color: `${theme.vars?.palette?.primary.contrastText} !important`,
                    ml: -1,
                  },
                  "& .MuiStepLabel-iconContainer svg": {
                    fontSize: 26,
                    color: theme.vars?.palette?.primary.contrastText,
                    transform: "scale(1.1)",
                  },
                }),
                ...(clickable && {
                  "&:hover": {
                    transform: "scale(1.05)",
                    cursor: "pointer",
                  },
                }),
              }}
              onClick={clickable ? () => onStepClick(idx) : undefined}
            >
              {step.label}
            </StepLabel>
          </Step>
        );
      })}
    </Stepper>
  );
};
