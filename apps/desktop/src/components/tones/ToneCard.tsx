import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import RadioButtonUncheckedIcon from "@mui/icons-material/RadioButtonUnchecked";
import { Box, ButtonBase, Card, IconButton, Tooltip, Typography } from "@mui/material";
import { Tone } from "@repo/types";
import { FormattedMessage, useIntl } from "react-intl";

type ToneCardProps = {
  tone: Tone;
  isSelected: boolean;
  isActive: boolean;
  onSelect: () => void;
  onSetActive: () => void;
};

export function ToneCard({
  tone,
  isSelected,
  isActive,
  onSelect,
  onSetActive,
}: ToneCardProps) {
  const intl = useIntl();
  const activeLabel = intl.formatMessage({
    defaultMessage: "Active tone",
  });
  const setActiveLabel = intl.formatMessage({
    defaultMessage: "Set as active tone",
  });

  return (
    <Card
      variant="outlined"
      sx={{
        borderColor: isSelected ? "primary.main" : "divider",
        borderWidth: isSelected ? 2 : 1,
        transition: "all 0.2s",
        flexShrink: 0,
      }}
    >
      <Box sx={{ display: "flex", alignItems: "center", px: 2, py: 1 }}>
        <ButtonBase
          onClick={onSelect}
          sx={{
            flex: 1,
            justifyContent: "flex-start",
            textAlign: "left",
            borderRadius: 1,
            px: 0,
            py: 0.5,
          }}
        >
          <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
            {tone.name}
          </Typography>
        </ButtonBase>

        <Tooltip
          title={
            isActive ? (
              <FormattedMessage defaultMessage="Active tone" />
            ) : (
              <FormattedMessage defaultMessage="Set as active tone" />
            )
          }
        >
          <IconButton
            size="small"
            color={isActive ? "primary" : "default"}
            aria-label={isActive ? activeLabel : setActiveLabel}
            onClick={(event) => {
              event.stopPropagation();
              onSetActive();
            }}
          >
            {isActive ? (
              <CheckCircleIcon fontSize="small" />
            ) : (
              <RadioButtonUncheckedIcon fontSize="small" />
            )}
          </IconButton>
        </Tooltip>
      </Box>
    </Card>
  );
}
