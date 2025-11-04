import { ExpandMore } from "@mui/icons-material";
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Chip,
  Stack,
  Typography,
  useTheme,
  type SxProps,
} from "@mui/material";

type FaqRowProps = {
  title?: React.ReactNode;
  children?: React.ReactNode;
};

const FaqRow = ({ title, children }: FaqRowProps) => {
  return (
    <Accordion sx={{ width: "100%" }}>
      <AccordionSummary expandIcon={<ExpandMore />}>{title}</AccordionSummary>
      <AccordionDetails>{children}</AccordionDetails>
    </Accordion>
  );
};

export type FaqProps = {
  sx?: SxProps;
};

export const Faq = ({ sx }: FaqProps) => {
  const theme = useTheme();

  return (
    <Stack justifyContent="center" alignItems="center">
      <Stack alignItems="stretch" sx={{ p: 4, gap: 2, maxWidth: 800, ...sx }}>
        <Chip
          label="FAQ"
          sx={{ bgcolor: theme.palette.level1, alignSelf: "center" }}
        />
        <Typography variant="h4" sx={{ mb: 2 }} textAlign="center">
          Frequently asked questions
        </Typography>
        <FaqRow title="How does the voice activation work?">
          Simply click the microphone bubble that appears in any text input
          field. Start speaking and watch as your voice is converted to text in
          real-time.
        </FaqRow>
        <FaqRow title="What websites does it work on?">
          Voquill works on virtually any website with text input fields - email
          clients, social media, forms, documents, and more.
        </FaqRow>
        <FaqRow title="Is my voice data secure?">
          Absolutely. Our code is open-source, so you can see for yourself. You
          can even choose to process your voice entirely on-device.
        </FaqRow>
      </Stack>
    </Stack>
  );
};
