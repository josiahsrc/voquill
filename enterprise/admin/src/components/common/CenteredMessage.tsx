import { Box } from "@mui/material";

export type CenteredMessageProps = {
  children: React.ReactNode;
};

export const CenteredMessage = ({ children }: CenteredMessageProps) => {
  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 2,
        py: 4,
      }}
    >
      {children}
    </Box>
  );
};
