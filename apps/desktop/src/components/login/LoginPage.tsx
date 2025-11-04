import { Card, Stack } from "@mui/material";
import { LoginForm } from "./LoginForm";

export default function LoginPage() {
  return (
    <Stack
      alignItems="center"
      justifyContent="center"
      sx={{ p: 2, minHeight: "100%", pb: { xs: 4, md: 8 } }}
    >
      <Card
        sx={{
          p: { xs: 2, sm: 4 },
          boxShadow: 6,
          width: { xs: "100%", md: 520 },
          maxWidth: "100%",
          overflow: "hidden",
        }}
      >
        <LoginForm />
      </Card>
    </Stack>
  );
}
