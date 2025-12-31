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
      elevation={8}
      sx={(theme) => ({
        display: "flex",
        alignItems: "flex-start",
        gap: 1.5,
        p: 2,
        borderRadius: `${theme.shape.borderRadius}px`,
        backgroundColor: theme.vars?.palette.level1 ?? theme.palette.grey[100],
        border: `1px solid ${theme.vars?.palette.level2 ?? theme.palette.grey[300]}`,
        boxShadow: `0 10px 40px ${theme.vars?.palette.shadow ?? "rgba(0,0,0,0.15)"}, 0 4px 12px ${theme.vars?.palette.shadow ?? "rgba(0,0,0,0.1)"}`,
      })}
    >
      <Box sx={{ flexShrink: 0, pt: 0.25 }}>
        {isError ? (
          <ErrorOutlineIcon
            sx={(theme) => ({
              color: theme.vars?.palette.error.main ?? theme.palette.error.main,
              fontSize: 24,
            })}
          />
        ) : (
          <InfoOutlinedIcon
            sx={(theme) => ({
              color: theme.vars?.palette.blue ?? theme.palette.info.main,
              fontSize: 24,
            })}
          />
        )}
      </Box>
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Typography
          variant="subtitle2"
          sx={(theme) => ({
            fontWeight: 600,
            color: isError
              ? (theme.vars?.palette.error.main ?? theme.palette.error.main)
              : (theme.vars?.palette.text.primary ?? theme.palette.text.primary),
            mb: 0.5,
          })}
        >
          {toast.title}
        </Typography>
        <Typography
          variant="body2"
          sx={(theme) => ({
            color:
              theme.vars?.palette.text.secondary ?? theme.palette.text.secondary,
            wordBreak: "break-word",
          })}
        >
          {toast.message}
        </Typography>
      </Box>
    </Paper>
  );
};
