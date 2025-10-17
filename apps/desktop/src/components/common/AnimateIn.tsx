import { Box, Fade, Zoom } from "@mui/material";

export type AnimateInProps = {
	children: React.ReactElement<unknown, any>;
	visible?: boolean;
};

export const AnimateIn = ({ children, visible = true }: AnimateInProps) => {
	return (
		<Fade in={visible} timeout={300} unmountOnExit>
			<Box>
				<Zoom in={visible} timeout={200}>
					<div style={{ display: visible ? "block" : "none" }}>{children}</div>
				</Zoom>
			</Box>
		</Fade>
	);
};
