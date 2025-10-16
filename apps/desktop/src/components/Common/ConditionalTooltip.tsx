import { Tooltip } from "@mui/material";
import type { TooltipProps } from "@mui/material";

interface ConditionalTooltipProps extends TooltipProps {
	enabled?: boolean;
}

export const ConditionalTooltip = ({
	enabled = true,
	children,
	...props
}: ConditionalTooltipProps) => {
	if (!enabled) {
		return <>{children}</>;
	}

	return <Tooltip {...props}>{children}</Tooltip>;
};
