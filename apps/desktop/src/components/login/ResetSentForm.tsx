import { ArrowBack } from "@mui/icons-material";
import { Button, Stack, Typography } from "@mui/material";
import { setMode } from "../../actions/login.actions";

export const ResetSentForm = () => {
	const handleClickBack = () => {
		setMode("signIn");
	};

	return (
		<Stack spacing={2} alignItems="center">
			<Typography textAlign="center" variant="body2">
				An email has been sent to you with a link to reset your password.
			</Typography>
			<Button size="small" startIcon={<ArrowBack />} onClick={handleClickBack}>
				Back
			</Button>
		</Stack>
	);
};
