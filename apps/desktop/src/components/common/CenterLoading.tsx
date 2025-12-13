import { CircularProgress, Stack } from "@mui/material";

export const CenterLoading = () => {
  return (
    <Stack
      sx={{
        height: "100%",
        justifyContent: "center",
        alignItems: "center",
        pb: 8,
      }}
      spacing={2}
    >
      <CircularProgress />
    </Stack>
  );
};
