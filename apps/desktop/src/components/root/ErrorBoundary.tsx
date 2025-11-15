import { Button, Stack, Typography } from "@mui/material";
import {
  isRouteErrorResponse,
  useNavigate,
  useRouteError,
} from "react-router-dom";
import { FormattedMessage } from "react-intl";
import { PageLayout } from "../common/PageLayout";
import { AppHeader } from "./Header";

const ErrorContent = () => {
  const error = useRouteError();

  if (isRouteErrorResponse(error)) {
    if (error.status === 404) {
      return (
        <Typography variant="h4">
          <FormattedMessage defaultMessage="404 - page not found" />
        </Typography>
      );
    }

    return (
      <>
        <Typography variant="h4">
          {error.status} - {error.statusText}
        </Typography>
        <Typography>{error.data?.message}</Typography>
      </>
    );
  }

  return (
    <>
      <Typography variant="h4">
        <FormattedMessage defaultMessage="Something went wrong." />
      </Typography>
      <Typography>{(error as Error).message}</Typography>
    </>
  );
};

export default function ErrorBoundary() {
  const nav = useNavigate();

  const handleGoHome = () => {
    nav("/");
  };

  return (
    <PageLayout header={<AppHeader />}>
      <Stack
        sx={{
          width: "100%",
          height: "100%",
          justifyContent: "center",
          alignItems: "center",
          textAlign: "center",
          pb: 16,
        }}
        spacing={2}
      >
        <Stack sx={{ maxWidth: 800 }} spacing={3} alignItems="center">
          <ErrorContent />
          <Button variant="contained" onClick={handleGoHome}>
            <FormattedMessage defaultMessage="Return home" />
          </Button>
        </Stack>
      </Stack>
    </PageLayout>
  );
}
