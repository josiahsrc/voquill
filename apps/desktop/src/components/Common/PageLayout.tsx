import { Stack, GlobalStyles } from "@mui/material";

export type PageLayoutProps = {
	header: React.ReactNode;
	children: React.ReactNode;
	footer?: React.ReactNode;
};

export const PageLayout = ({ header, footer, children }: PageLayoutProps) => (
	<>
		<GlobalStyles
			styles={{
				"@supports (-webkit-touch-callout: none)": {
					html: {
						height: "100%",
						overflow: "hidden",
						overscrollBehavior: "none",
					},
					body: {
						height: "100%",
						overflow: "hidden",
						overscrollBehavior: "none",
					},
				},
			}}
		/>

		<Stack
			sx={{
				inset: 0,
				width: "100%",
				height: "100%",
				overflow: "hidden",
				overscrollBehavior: "none",
			}}
		>
			<Stack sx={{ flexShrink: 0, overscrollBehavior: "contain" }}>
				{header}
			</Stack>

			<Stack
				sx={{
					flexGrow: 1,
					overflowY: "auto",
				}}
			>
				{children}
				{footer}
			</Stack>
		</Stack>
	</>
);
