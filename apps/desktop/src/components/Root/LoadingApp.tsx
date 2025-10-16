import { Box, CircularProgress } from "@mui/material";

export const LoadingApp = () => {
	return (
		<Box
			sx={{
				width: "100vw",
				height: "100vh",
				display: "flex",
				justifyContent: "center",
				alignItems: "center",
			}}
		>
			<CircularProgress />
		</Box>
	);
};
