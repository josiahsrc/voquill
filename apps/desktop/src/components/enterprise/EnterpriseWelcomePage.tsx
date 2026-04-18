import { Box, Stack, Typography, useTheme } from "@mui/material";
import { motion } from "framer-motion";
import { FormattedMessage } from "react-intl";
import { Logo } from "../common/Logo";
import { LoginForm } from "../login/LoginForm";
import { VectorField } from "../welcome/VectorField";

const MotionStack = motion.create(Stack);

export default function EnterpriseWelcomePage() {
  const theme = useTheme();

  return (
    <Box
      sx={{
        position: "relative",
        width: "100%",
        height: "100%",
        overflow: "hidden",
      }}
    >
      <VectorField />
      <Stack
        alignItems="center"
        sx={{
          position: "relative",
          zIndex: 1,
          height: "100%",
          width: "100%",
        }}
      >
        <MotionStack
          spacing={4}
          justifyContent="center"
          initial={{ scaleX: 0, opacity: 0 }}
          animate={{ scaleX: 1, opacity: 1 }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          sx={{
            width: 520,
            maxWidth: "100%",
            height: "100%",
            backgroundColor: theme.vars?.palette.background.default,
            boxShadow: "0 0 40px rgba(0, 0, 0, 0.15)",
            ...theme.applyStyles("dark", {
              boxShadow: "0 0 40px rgba(0, 0, 0, 0.6)",
            }),
            px: 7,
            py: 6,
            overflowY: "auto",
            transformOrigin: "center",
          }}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{
              duration: 0.7,
              delay: 0.5,
              ease: [0.25, 0.1, 0.25, 1],
            }}
            style={{ willChange: "transform, opacity" }}
          >
            <Stack spacing={2} alignItems="center" textAlign="center">
              <Stack direction="row" alignItems="center" spacing={1}>
                <Logo width="4rem" height="4rem" />
                <Typography variant="h3" fontWeight={700}>
                  Voquill
                </Typography>
              </Stack>
              <Typography variant="body1" color="text.secondary">
                <FormattedMessage defaultMessage="Voice is your new keyboard." />
              </Typography>
            </Stack>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{
              duration: 0.5,
              delay: 0.5,
              ease: [0.25, 0.1, 0.25, 1],
            }}
            style={{ willChange: "transform, opacity" }}
          >
            <LoginForm defaultMode="signIn" />
          </motion.div>
        </MotionStack>
      </Stack>
    </Box>
  );
}
