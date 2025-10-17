import { Container, Stack } from "@mui/material";

export type DashboardEntryLayoutProps = {
  children: React.ReactNode;
};
export const DashboardEntryLayout = ({
  children,
}: DashboardEntryLayoutProps) => {
  return (
    <Stack
      sx={{
        flexGrow: 1,
        overflowY: "auto",
        pr: 2,
      }}
    >
      <Container
        maxWidth="sm"
        sx={{
          display: "flex",
          flexDirection: "column",
          pt: 1,
          pb: 8,
        }}
      >
        {children}
      </Container>
    </Stack>
  );
};
