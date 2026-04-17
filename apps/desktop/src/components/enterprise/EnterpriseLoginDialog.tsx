import { Dialog, DialogContent } from "@mui/material";
import { LoginForm } from "../login/LoginForm";

type EnterpriseLoginDialogProps = {
  open: boolean;
  onClose: () => void;
};

export const EnterpriseLoginDialog = ({
  open,
  onClose,
}: EnterpriseLoginDialogProps) => {
  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogContent>
        <LoginForm defaultMode="signIn" hideModeSwitch />
      </DialogContent>
    </Dialog>
  );
};
