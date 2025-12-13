import { Stack, Typography } from "@mui/material";

export type StatProps = {
  label: string;
  value: number;
};

export const Stat = ({ label, value }: StatProps) => {
  return (
    <Stack
      direction="column"
      spacing={1}
      sx={{ textAlign: "center" }}
      alignItems="center"
    >
      <Typography variant="h3" fontWeight={700}>
        {value.toLocaleString()}
      </Typography>
      <Typography variant="body2" color="text.secondary" fontSize={20}>
        {label}
      </Typography>
    </Stack>
  );
};
