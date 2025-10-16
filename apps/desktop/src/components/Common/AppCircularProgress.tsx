import { CircularProgress, type SxProps } from "@mui/material";

export type AppCircularProgressProps = {
	size?: number;
	value?: number;
	sx?: SxProps;
};

export const AppCircularProgress = ({
	size,
	value,
	sx,
}: AppCircularProgressProps) => {
	return (
		<CircularProgress
			size={size}
			value={value}
			sx={sx}
			variant={value ? "determinate" : "indeterminate"}
		/>
	);
};
