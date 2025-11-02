import { Stack, SxProps } from "@mui/material";

export type FormContainerProps = {
  children: React.ReactNode;
  sx?: SxProps;
};

export const FormContainer = ({ children, sx }: FormContainerProps) => {
  return (
    <Stack
      sx={{ maxWidth: 500, width: "100%", p: 2, maxHeight: "100%", ...sx }}
    >
      {children}
    </Stack>
  );
};
