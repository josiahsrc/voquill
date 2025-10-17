import { Stack } from "@mui/material";

export type FormContainerProps = {
  children: React.ReactNode;
};

export const FormContainer = ({ children }: FormContainerProps) => {
  return <Stack sx={{ maxWidth: 400, width: "100%", p: 2 }}>{children}</Stack>;
};
