import { Box, Stack, Typography } from "@mui/material";

export type CenterMessageProps = {
	title?: React.ReactNode;
	description?: React.ReactNode;
	button?: React.ReactNode;
};

export const CenterMessage = ({
	title,
	description,
	button,
}: CenterMessageProps) => {
	return (
		<Stack alignItems="center" sx={{ height: "100%" }} spacing={3}>
			<Box flexGrow={2} />
			{title && <Typography variant="h4">{title}</Typography>}
			{description && (
				<Typography variant="body1" color="textSecondary">
					{description}
				</Typography>
			)}
			{button}
			<Box flexGrow={3} />
		</Stack>
	);
};
