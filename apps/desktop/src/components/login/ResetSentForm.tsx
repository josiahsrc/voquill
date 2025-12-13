import { ArrowBack } from "@mui/icons-material";
import { Button, Stack, Typography } from "@mui/material";
import { FormattedMessage } from "react-intl";
import { setMode } from "../../actions/login.actions";

export const ResetSentForm = () => {
  const handleClickBack = () => {
    setMode("signIn");
  };

  return (
    <Stack spacing={2} alignItems="center">
      <Typography textAlign="center" variant="body2">
        <FormattedMessage defaultMessage="An email has been sent to you with a link to reset your password." />
      </Typography>
      <Button size="small" startIcon={<ArrowBack />} onClick={handleClickBack}>
        <FormattedMessage defaultMessage="Back" />
      </Button>
    </Stack>
  );
};
