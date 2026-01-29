import { Box, Stack, Toolbar, Typography } from "@mui/material";

export type TabLayoutProps = {
  title: React.ReactNode;
  trailing?: React.ReactNode;
  children: React.ReactNode;
};

export const TabLayout = ({ title, trailing, children }: TabLayoutProps) => {
  return (
    <Stack sx={{ height: "100%", width: "100%" }}>
      <Toolbar
        sx={{
          flexShrink: 0,
          justifyContent: "space-between",
        }}
      >
        <Typography variant="h6">{title}</Typography>
        {trailing && <Box>{trailing}</Box>}
      </Toolbar>
      <Box sx={{ flexGrow: 1, overflow: "auto", px: 3, pb: 3 }}>
        {children}
      </Box>
    </Stack>
  );
};
