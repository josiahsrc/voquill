import "@mui/material/styles";
import "@mui/material/Button";
import "@mui/material/Card";
import "@mui/material/Paper";
import "@mui/material/Typography";

declare module "@mui/material/styles" {
  interface Palette {
    goldBg: string;
    goldFg: string;
    shadow: string;
    blue: string;

    level0: string;
    level1: string;
    level2: string;
    level3: string;
  }
  interface PaletteOptions {
    goldBg?: string;
    goldFg?: string;
    shadow?: string;
    blue?: string;

    level0?: string;
    level1?: string;
    level2?: string;
    level3?: string;
  }
}

declare module "@mui/material/Button" {
  interface ButtonPropsVariantOverrides {
    flat: true;
  }
}
declare module "@mui/material/Card" {
  interface CardPropsVariantOverrides {
    flat: true;
  }
}
declare module "@mui/material/Paper" {
  interface PaperPropsVariantOverrides {
    flat: true;
  }
}

declare module "@mui/material/styles" {
  interface TypographyVariants {
    displayLarge: React.CSSProperties;
    displayMedium: React.CSSProperties;
    displaySmall: React.CSSProperties;

    headlineLarge: React.CSSProperties;
    headlineMedium: React.CSSProperties;
    headlineSmall: React.CSSProperties;

    titleLarge: React.CSSProperties;
    titleMedium: React.CSSProperties;
    titleSmall: React.CSSProperties;

    bodyLarge: React.CSSProperties;
    bodyMedium: React.CSSProperties;
    bodySmall: React.CSSProperties;

    labelLarge: React.CSSProperties;
    labelMedium: React.CSSProperties;
    labelSmall: React.CSSProperties;
  }

  /* eslint-disable @typescript-eslint/no-empty-object-type */
  interface TypographyVariantsOptions extends TypographyVariants { }
}

declare module "@mui/material/Typography" {
  interface TypographyPropsVariantOverrides {
    displayLarge: true;
    displayMedium: true;
    displaySmall: true;

    headlineLarge: true;
    headlineMedium: true;
    headlineSmall: true;

    titleLarge: true;
    titleMedium: true;
    titleSmall: true;

    bodyLarge: true;
    bodyMedium: true;
    bodySmall: true;

    labelLarge: true;
    labelMedium: true;
    labelSmall: true;
  }
}
