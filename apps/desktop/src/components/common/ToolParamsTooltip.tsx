import { InfoOutlined } from "@mui/icons-material";
import { Box, Tooltip } from "@mui/material";

type ToolParamsTooltipProps = {
  params: Record<string, unknown>;
  iconColor?: string;
  iconSize?: number;
};

export const ToolParamsTooltip = ({
  params,
  iconColor = "text.secondary",
  iconSize = 16,
}: ToolParamsTooltipProps) => {
  const { reason: _, ...displayParams } = params;
  const hasParams = Object.keys(displayParams).length > 0;
  if (!hasParams) return null;

  return (
    <Tooltip
      title={
        <Box
          component="pre"
          sx={{ m: 0, fontSize: "0.75rem", whiteSpace: "pre-wrap" }}
        >
          {JSON.stringify(displayParams, null, 2)}
        </Box>
      }
      arrow
      placement="top"
    >
      <InfoOutlined
        sx={{ fontSize: iconSize, color: iconColor, cursor: "help" }}
      />
    </Tooltip>
  );
};
