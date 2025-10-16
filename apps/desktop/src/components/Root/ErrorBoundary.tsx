import { Button, Stack, Typography } from "@mui/material";
import {
  isRouteErrorResponse,
  useNavigate,
  useRouteError,
} from "react-router-dom";
import { PageLayout } from "../Common/PageLayout";
import { AppHeader } from "./Header";

const ErrorContent = () => {
  const error = useRouteError();

  if (isRouteErrorResponse(error)) {
    if (error.status === 404) {
      return <Typography variant="h4">404 - page not found</Typography>;
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
      <Typography variant="h4">Something went wrong.</Typography>
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
          width: "100vw",
          height: "100vh",
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
            Return home
          </Button>
        </Stack>
      </Stack>
    </PageLayout>
  );
}
