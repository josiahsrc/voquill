import { type ReactNode } from "react";
import { Stack, Typography } from "@mui/material";

export type SectionProps = {
  title: string;
  description?: string;
  children?: ReactNode;
};

export const Section = ({ title, description, children }: SectionProps) => {
  const content = children as unknown as ReactNode;
  return (
    <Stack component="section" spacing={1.5} mb={5}>
      <Typography variant="h6" fontWeight={700} sx={{ mb: 1 }}>
        {title}
      </Typography>
      {description && (
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
          {description}
        </Typography>
      )}
      <Stack spacing={2}>{content as unknown as any}</Stack>
    </Stack>
  );
};
