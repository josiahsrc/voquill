import { createTheme, type Shadows } from "@mui/material/styles";

declare module "@mui/material/styles" {
  interface Palette {
    goldFg: string;
    goldBg: string;
    level0: string;
    level1: string;
    level2: string;
    level3: string;
  }

  interface PaletteOptions {
    goldFg?: string;
    goldBg?: string;
    level0?: string;
    level1?: string;
    level2?: string;
    level3?: string;
  }
}

export const theme = createTheme({
  palette: {
    mode: "light",
    primary: { main: "#12151C" },
    secondary: { main: "#404040" },

    goldFg: "rgb(104, 48, 9)",
    goldBg: "rgba(255, 193, 7, 0.6)",

    level0: "#FFFFFF",
    level1: "#F5F5F5",
    level2: "#E0E0E0",
    level3: "#D0D0D0",
  },

  shape: { borderRadius: 12 },

  shadows: Array(25).fill("none") as unknown[] as Shadows,

  typography: {
    fontFamily: '"Roboto","Helvetica","Arial",sans-serif',
    pxToRem: (px: number) => `${px / 16}rem`,

    displayLarge: { fontSize: 57, lineHeight: 1, fontWeight: 400 },
    displayMedium: { fontSize: 45, lineHeight: 1, fontWeight: 400 },
    displaySmall: { fontSize: 36, lineHeight: 1, fontWeight: 400 },

    headlineLarge: { fontSize: 32, lineHeight: 1, fontWeight: 400 },
    headlineMedium: { fontSize: 28, lineHeight: 1, fontWeight: 400 },
    headlineSmall: { fontSize: 24, lineHeight: 1, fontWeight: 400 },

    titleLarge: { fontSize: 24, lineHeight: 1, fontWeight: 400 },
    titleMedium: { fontSize: 18, lineHeight: 1, fontWeight: 500 },
    titleSmall: { fontSize: 16, lineHeight: 1, fontWeight: 500 },

    bodyLarge: { fontSize: 18, lineHeight: 1, fontWeight: 400 },
    bodyMedium: { fontSize: 16, lineHeight: 1, fontWeight: 400 },
    bodySmall: { fontSize: 14, lineHeight: 1, fontWeight: 400 },

    labelLarge: { fontSize: 16, lineHeight: 1, fontWeight: 500 },
    labelMedium: { fontSize: 14, lineHeight: 1, fontWeight: 500 },
    labelSmall: { fontSize: 13, lineHeight: 1, fontWeight: 500 },

    body1: { fontSize: 16, lineHeight: 1.5, fontWeight: 400 },
    body2: { fontSize: 14, lineHeight: 1.5, fontWeight: 400 },
  },

  components: {
    MuiCssBaseline: {
      styleOverrides: (theme) => ({
        body: {
          backgroundColor: theme.palette.level0,
          color: theme.palette.text?.primary,
          transition: "background-color 0.3s ease",
        },
      }),
    },

    MuiDialog: {
      styleOverrides: {
        paper: ({ theme }) => ({
          backgroundColor: theme.palette.level0,
        }),
      },
    },

    MuiDialogContent: {
      styleOverrides: {
        root: ({ theme }) => ({
          paddingBottom: theme.spacing(0),
        }),
      },
    },

    MuiDialogActions: {
      styleOverrides: {
        root: ({ theme }) => ({
          padding: theme.spacing(3),
          paddingTop: theme.spacing(2),
          paddingBottom: theme.spacing(2),
        }),
      },
    },

    MuiAppBar: {
      styleOverrides: {
        root: ({ theme }) => ({
          backgroundColor: theme.palette.level0,
          boxShadow: "0 2px 4px rgba(0, 0, 0, 0.1)",
          borderBottom: `1px solid ${theme.palette.divider}`,
          transition: "background-color 0.3s ease",
        }),
      },
    },

    MuiTooltip: {
      styleOverrides: {
        tooltip: ({ theme }) => ({
          fontSize: theme.typography.pxToRem(14),
          fontWeight: 500,
        }),
      },
    },

    MuiFab: {
      styleOverrides: {
        root: ({ theme }) => ({
          textTransform: "none",
          fontSize: theme.typography.pxToRem(20),
          borderRadius: 99,
          padding: theme.spacing(2, 3),
          "& .MuiSvgIcon-root": {
            fontSize: 28,
          },
        }),
      },
    },

    MuiAccordion: {
      styleOverrides: {
        root: ({ theme }) => ({
          backgroundColor: theme.palette.level1,
          borderRadius: theme.shape.borderRadius,
          boxShadow: "none",
          "&:before": {
            display: "none",
          },
          "&.Mui-expanded": {
            margin: "auto",
          },
        }),
        rounded: ({ theme }) => ({
          borderRadius: theme.shape.borderRadius,
        }),
      },
    },

    MuiAccordionSummary: {
      styleOverrides: {
        root: ({ theme }) => ({
          fontSize: theme.typography.pxToRem(16),
          color: theme.palette.text.primary,
        }),
      },
    },

    MuiAccordionDetails: {
      styleOverrides: {
        root: ({ theme }) => ({
          fontSize: theme.typography.pxToRem(16),
          color: theme.palette.text.secondary,
        }),
      },
    },

    MuiButton: {
      defaultProps: { disableElevation: true },
      styleOverrides: {
        root: ({ theme }) => ({
          textTransform: "none",
          fontWeight: 500,
          borderRadius: theme.shape.borderRadius,
          fontSize: theme.typography.pxToRem(18),
          padding: theme.spacing(1, 2),
          "& .MuiSvgIcon-root": {
            fontSize: 24,
          },
        }),
        text: ({ theme }) => ({
          color: theme.palette.primary.main,
          "&:hover": {
            backgroundColor: theme.palette.level1,
          },
          "&:active": {
            backgroundColor: theme.palette.level0,
          },
        }),
        contained: ({ theme }) => ({
          "&:hover": {
            backgroundColor: theme.palette.primary.light,
          },
          "&:active": {
            backgroundColor: theme.palette.primary.main,
          },
        }),
      },
      variants: [
        {
          props: { variant: "flat" },
          style: ({ theme }) => ({
            backgroundColor: theme.palette.level1,
            color: theme.palette.primary.main,
            "&:hover": {
              backgroundColor: theme.palette.level2,
            },
            "&:active": {
              backgroundColor: theme.palette.level3,
            },
            fontSize: theme.typography.pxToRem(18),
            "& .MuiButton-startIcon > .MuiSvgIcon-root, \
    & .MuiButton-endIcon  > .MuiSvgIcon-root": {
              fontSize: 24,
            },
          }),
        },
      ],
    },

    MuiPaper: {
      defaultProps: { elevation: 0, variant: "flat" },
      styleOverrides: {
        outlined: ({ theme }) => ({
          backgroundColor: theme.palette.level0,
          border: `1px solid ${theme.palette.primary.main}`,
        }),
      },
      variants: [
        {
          props: { variant: "flat" },
          style: ({ theme }) => ({
            backgroundColor: theme.palette.level1,
          }),
        },
      ],
    },

    MuiStepLabel: {
      styleOverrides: {
        root: ({ theme }) => ({
          backgroundColor: theme.palette.level0,
          fontSize: theme.typography.pxToRem(18),
        }),
        vertical: ({ theme }) => ({
          backgroundColor: theme.palette.level0,
          fontSize: theme.typography.pxToRem(18),
        }),
      },
    },

    MuiIconButton: {
      styleOverrides: {
        root: ({ theme }) => ({
          color: theme.palette.text.primary,
        }),
      },
    },

    MuiCard: {
      defaultProps: { variant: "flat" },
      variants: [
        {
          props: { variant: "flat" },
          style: ({ theme }) => ({
            backgroundColor: theme.palette.level1,
          }),
        },
      ],
    },

    MuiListItemButton: {
      styleOverrides: {
        root: () => ({
          borderRadius: 12,
        }),
      },
    },

    MuiToggleButton: {
      styleOverrides: {
        root: () => ({
          textTransform: "none",
        }),
      },
    },

    MuiDrawer: {
      styleOverrides: {
        paper: ({ theme }) => ({
          backgroundColor: theme.palette.level0,
          color: theme.palette.text.primary,
        }),
      },
    },
  },
});
