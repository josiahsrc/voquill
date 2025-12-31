import { Box, Paper, Typography } from "@mui/material";
import ErrorOutlineIcon from "@mui/icons-material/ErrorOutline";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import { Toast } from "../../types/toast.types";

type ToastItemProps = {
  toast: Toast;
};

export const ToastItem = ({ toast }: ToastItemProps) => {
  const isError = toast.toastType === "error";

  return (
    <Paper
      elevation={4}
      sx={{
        display: "flex",
        alignItems: "flex-start",
        gap: 1.5,
        p: 2,
        borderRadius: 2,
        backgroundColor: isError ? "#fef2f2" : "#f0f9ff",
        border: `1px solid ${isError ? "#fecaca" : "#bae6fd"}`,
      }}
    >
      <Box sx={{ flexShrink: 0, pt: 0.25 }}>
        {isError ? (
          <ErrorOutlineIcon sx={{ color: "#dc2626", fontSize: 24 }} />
        ) : (
          <InfoOutlinedIcon sx={{ color: "#0284c7", fontSize: 24 }} />
        )}
      </Box>
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Typography
          variant="subtitle2"
          sx={{
            fontWeight: 600,
            color: isError ? "#991b1b" : "#075985",
            mb: 0.5,
          }}
        >
          {toast.title}
        </Typography>
        <Typography
          variant="body2"
          sx={{
            color: isError ? "#b91c1c" : "#0369a1",
            wordBreak: "break-word",
          }}
        >
          {toast.message}
        </Typography>
      </Box>
    </Paper>
  );
};
