import { useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { FormattedMessage } from "react-intl";
import { Box, CircularProgress, Typography, Link } from "@mui/material";
import { handleOidcCallback } from "../../actions/login.actions";

export default function OidcCallbackPage() {
  const navigate = useNavigate();
  const result = useMemo(() => handleOidcCallback(), []);

  useEffect(() => {
    if (!result.error) {
      navigate("/", { replace: true });
    }
  }, [result, navigate]);

  return (
    <Box
      sx={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        bgcolor: "level1",
        gap: 2,
      }}
    >
      {result.error ? (
        <>
          <Typography color="error">{result.error}</Typography>
          <Link href="/login">
            <FormattedMessage defaultMessage="Back to login" />
          </Link>
        </>
      ) : (
        <>
          <CircularProgress />
          <Typography color="text.secondary">
            <FormattedMessage defaultMessage="Signing in..." />
          </Typography>
        </>
      )}
    </Box>
  );
}
