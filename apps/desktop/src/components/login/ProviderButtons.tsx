import { Google } from "@mui/icons-material";
import { Button } from "@mui/material";
import { useAppStore } from "../../store";
import { submitSignInWithGoogle } from "../../actions/login.actions";

export const SignInWithGoogleButton = () => {
	const loading = useAppStore((state) => state.login.status === "loading");

	return (
		<Button
			fullWidth
			variant="outlined"
			startIcon={<Google />}
			disabled={loading}
			onClick={submitSignInWithGoogle}
		>
			Continue with Google
		</Button>
	);
};
