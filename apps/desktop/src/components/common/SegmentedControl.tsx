import { Box, Tab, Tabs } from "@mui/material";
import { SyntheticEvent } from "react";

type SegmentedControlOption<Value extends string> = {
  value: Value;
  label: string;
};

export type SegmentedControlProps<Value extends string> = {
  value: Value;
  options: SegmentedControlOption<Value>[];
  onChange: (value: Value) => void;
  ariaLabel?: string;
};

const tabSx = {
  textTransform: "none",
  minHeight: "unset",
  py: 1.25,
  px: 2.5,
  borderRadius: 1.5,
  fontWeight: 600,
  transition: "all 0.2s ease",
  color: "text.secondary",
  "&.Mui-selected": {
    color: "text.primary",
    bgcolor: "background.paper",
    boxShadow:
      "inset 0 1px 3px rgba(0,0,0,0.2), 0 1px 2px rgba(0,0,0,0.05)",
  },
  "&:hover:not(.Mui-selected)": {
    color: "text.primary",
    bgcolor: "rgba(255,255,255,0.05)",
  },
};

export const SegmentedControl = <Value extends string>({
  value,
  options,
  onChange,
  ariaLabel,
}: SegmentedControlProps<Value>) => {
  const activeIndex = Math.max(
    0,
    options.findIndex((option) => option.value === value),
  );

  const handleChange = (_event: SyntheticEvent, index: number) => {
    const option = options[index];
    if (!option) {
      return;
    }

    if (option.value !== value) {
      onChange(option.value);
    }
  };

  return (
    <Box
      sx={{
        display: "inline-flex",
        bgcolor: "action.hover",
        borderRadius: 2,
        p: 0.5,
        border: 1,
        borderColor: "divider",
        maxWidth: "100%",
      }}
    >
      <Tabs
        value={activeIndex}
        onChange={handleChange}
        aria-label={ariaLabel}
        sx={{
          minHeight: "unset",
          "& .MuiTabs-indicator": {
            display: "none",
          },
        }}
      >
        {options.map((option) => (
          <Tab key={option.value} label={option.label} sx={tabSx} />
        ))}
      </Tabs>
    </Box>
  );
};
