import { CheckBox, CheckBoxOutlineBlank } from "@mui/icons-material";
import { Box, Stack, Tooltip, Typography } from "@mui/material";
import { FormattedMessage } from "react-intl";
import { isDefined } from "@repo/utilities";

type SectionProps = {
  title: string;
  description?: string;
  children?: React.ReactNode;
  enabled?: boolean;
  onToggleEnable?: () => void;
  blocked?: boolean;
  blockedReason?: string;
};

export const Section = ({
  title,
  description,
  children,
  enabled,
  onToggleEnable,
  blocked,
  blockedReason,
}: SectionProps) => {
  const fieldEnabled = !blocked && (enabled ?? true);
  const headerEnabled = !blocked;

  const content = (
    <Stack mb={4}>
      <Stack
        direction="row"
        alignItems="center"
        sx={{ opacity: headerEnabled ? 1 : 0.3 }}
      >
        <Typography variant="h6" fontWeight="bold">
          {title}
        </Typography>
        {isDefined(enabled) && (
          <Box
            sx={{ ml: 1, cursor: "pointer", pt: 1 }}
            onClick={onToggleEnable}
          >
            {enabled ? <CheckBox /> : <CheckBoxOutlineBlank />}
          </Box>
        )}
      </Stack>
      <Box sx={{ opacity: fieldEnabled ? 1 : 0.3 }}>
        {description && (
          <Typography variant="body2" color="textSecondary" mt={1}>
            {description}
          </Typography>
        )}
        <Box sx={{ mt: 2 }}>{children}</Box>
      </Box>
    </Stack>
  );

  if (blocked) {
    return (
      <Tooltip
        title={
          blockedReason || (
            <FormattedMessage defaultMessage="This setting is not available." />
          )
        }
        disableInteractive
      >
        <span
          style={{
            display: "inline-block",
            cursor: "not-allowed",
            pointerEvents: "none",
            position: "relative",
          }}
        >
          {content}
          <div
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              cursor: "not-allowed",
              pointerEvents: "auto",
            }}
          />
        </span>
      </Tooltip>
    );
  }

  return content;
};
