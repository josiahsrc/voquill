import { Button, ButtonProps, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle } from "@mui/material";
import { ReactNode } from "react";
import { FormattedMessage } from "react-intl";

export type ConfirmDialogProps = {
  isOpen: boolean;
  title: ReactNode;
  content: ReactNode;
  onCancel: () => void;
  onConfirm: () => void;
  confirmLabel?: ReactNode;
  cancelLabel?: ReactNode;
  confirmButtonProps?: ButtonProps;
  cancelButtonProps?: ButtonProps;
};

export const ConfirmDialog = ({
  isOpen,
  title,
  content,
  onCancel,
  onConfirm,
  confirmLabel,
  cancelLabel,
  confirmButtonProps,
  cancelButtonProps,
}: ConfirmDialogProps) => {
  return (
    <Dialog open={isOpen} onClose={onCancel} maxWidth="xs" fullWidth>
      <DialogTitle>{title}</DialogTitle>
      <DialogContent dividers>
        <DialogContentText>{content}</DialogContentText>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button variant="text" onClick={onCancel} {...cancelButtonProps}>
          {cancelLabel ?? <FormattedMessage defaultMessage="Cancel" />}
        </Button>
        <Button variant="contained" onClick={onConfirm} {...confirmButtonProps}>
          {confirmLabel ?? <FormattedMessage defaultMessage="Confirm" />}
        </Button>
      </DialogActions>
    </Dialog>
  );
};
