import {
  Box,
  Button,
  IconButton,
  keyframes,
  Paper,
  Typography,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import ErrorOutlineIcon from "@mui/icons-material/ErrorOutline";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import { useIntl } from "react-intl";
import { Toast, ToastAction } from "../../types/toast.types";

const DEFAULT_DURATION_MS = 3000;

// Progress bar shrinks from 100% to 0%
const shrinkProgress = keyframes`
  from {
    width: 100%;
  }
  to {
    width: 0%;
  }
`;

type ToastItemProps = {
  toast: Toast;
  onClose?: () => void;
  onAction?: (action: ToastAction) => void;
};

export const ToastItem = ({ toast, onClose, onAction }: ToastItemProps) => {
  const intl = useIntl();
  const isError = toast.toastType === "error";
  const duration = toast.duration ?? DEFAULT_DURATION_MS;

  const getActionLabel = (action: ToastAction): string => {
    switch (action) {
      case "upgrade":
        return intl.formatMessage({ defaultMessage: "Upgrade" });
    }
  };

  const actionLabel = toast.action ? getActionLabel(toast.action) : null;

  return (
    <Paper
      elevation={8}
      sx={(theme) => ({
        position: "relative",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        borderRadius: `${theme.shape.borderRadius}px`,
        backgroundColor: theme.vars?.palette.level1 ?? theme.palette.grey[100],
        border: `1px solid ${theme.vars?.palette.level2 ?? theme.palette.grey[300]}`,
        boxShadow: `0 10px 40px ${theme.vars?.palette.shadow ?? "rgba(0,0,0,0.15)"}, 0 4px 12px ${theme.vars?.palette.shadow ?? "rgba(0,0,0,0.1)"}`,
      })}
    >
      <IconButton
        size="small"
        onClick={onClose}
        sx={(theme) => ({
          position: "absolute",
          top: 4,
          right: 4,
          padding: 0.5,
          color:
            theme.vars?.palette.text.secondary ?? theme.palette.text.secondary,
          "&:hover": {
            color:
              theme.vars?.palette.text.primary ?? theme.palette.text.primary,
          },
        })}
      >
        <CloseIcon sx={{ fontSize: 16 }} />
      </IconButton>
      {/* Content */}
      <Box
        sx={{
          display: "flex",
          alignItems: "flex-start",
          gap: 1.5,
          p: 2,
        }}
      >
        <Box sx={{ flexShrink: 0, pt: 0.25 }}>
          {isError ? (
            <ErrorOutlineIcon
              sx={(theme) => ({
                color:
                  theme.vars?.palette.error.main ?? theme.palette.error.main,
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
                : (theme.vars?.palette.text.primary ??
                  theme.palette.text.primary),
              mb: 0.5,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            })}
          >
            {toast.title}
          </Typography>
          <Typography
            variant="body2"
            sx={(theme) => ({
              color:
                theme.vars?.palette.text.secondary ??
                theme.palette.text.secondary,
              wordBreak: "break-word",
              display: "-webkit-box",
              WebkitLineClamp: 3,
              WebkitBoxOrient: "vertical",
              overflow: "hidden",
            })}
          >
            {toast.message}
          </Typography>
        </Box>
        {actionLabel && toast.action && (
          <Box sx={{ flexShrink: 0, ml: 1 }} alignSelf="center">
            <Button
              size="small"
              variant="contained"
              onClick={() => onAction?.(toast.action!)}
              sx={{
                textTransform: "none",
                whiteSpace: "nowrap",
                fontSize: 12,
                py: 0.5,
                px: 1.5,
                minWidth: "auto",
              }}
            >
              {actionLabel}
            </Button>
          </Box>
        )}
      </Box>

      {/* Progress bar */}
      <Box
        sx={(theme) => ({
          height: 4,
          backgroundColor:
            theme.vars?.palette.level2 ?? theme.palette.grey[300],
        })}
      >
        <Box
          sx={(theme) => ({
            height: "100%",
            backgroundColor:
              theme.vars?.palette.primary.main ?? theme.palette.primary.main,
            animation: `${shrinkProgress} ${duration}ms linear forwards`,
          })}
        />
      </Box>
    </Paper>
  );
};
