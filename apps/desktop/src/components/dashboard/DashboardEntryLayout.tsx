import { Container, Stack, type ContainerProps } from "@mui/material";

export type DashboardEntryLayoutProps = {
  children: React.ReactNode;
  maxWidth?: ContainerProps["maxWidth"];
};
export const DashboardEntryLayout = ({
  children,
  maxWidth = "sm",
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
        maxWidth={maxWidth}
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
