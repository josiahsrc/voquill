import CloseIcon from "@mui/icons-material/Close";
import { IconButton, Snackbar, useTheme } from "@mui/material";
import { useEffect, useState } from "react";
import { useAppStore } from "../../store";

export const SnackbarEmitter = () => {
	const snackbarCounter = useAppStore((state) => state.snackbarCounter);
	const snackbarMessage = useAppStore((state) => state.snackbarMessage);
	const snackbarDuration = useAppStore((state) => state.snackbarDuration);
	const snackbarTransitionDuration = useAppStore(
		(state) => state.snackbarTransitionDuration,
	);
	const snackbarMode = useAppStore((state) => state.snackbarMode);
	const theme = useTheme();
	const [open, setOpen] = useState(false);

	const handleClose = (_: unknown, reason?: string) => {
		if (reason === "clickaway") {
			return;
		}

		setOpen(false);
	};

	useEffect(() => {
		if (snackbarCounter > 0) {
			setOpen(true);
		}
	}, [snackbarCounter]);

	let backgroundColor: string;
	if (snackbarMode === "error") {
		backgroundColor = theme.palette.error.main;
	} else if (snackbarMode === "success") {
		backgroundColor = theme.palette.success.main;
	} else {
		backgroundColor = theme.palette.primary.main;
	}

	return (
		<Snackbar
			key={snackbarCounter}
			open={open}
			transitionDuration={snackbarTransitionDuration}
			autoHideDuration={snackbarDuration}
			onClose={handleClose}
			message={<span style={{ color: "#fff" }}>{snackbarMessage}</span>}
			anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
			action={
				<IconButton
					size="small"
					aria-label="close"
					color="inherit"
					onClick={() => setOpen(false)}
				>
					<CloseIcon fontSize="small" style={{ color: "#fff" }} />
				</IconButton>
			}
			slotProps={{
				content: {
					style: {
						backgroundColor,
					},
				},
			}}
		/>
	);
};
