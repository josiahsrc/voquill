import { ArrowForward, AutoAwesome } from "@mui/icons-material";
import {
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { ChangeEvent, Fragment, useEffect, useRef, useState } from "react";
import { FormattedMessage, useIntl } from "react-intl";
import { showConfetti } from "../../actions/app.actions";
import { markFeatureSeen } from "../../actions/user.actions";
import { useAppStore } from "../../store";
import { CURRENT_FEATURE } from "../../utils/feature.utils";
import {
  AGENT_DICTATE_HOTKEY,
  getHotkeyCombosForAction,
} from "../../utils/keyboard.utils";
import { getMyUserPreferences } from "../../utils/user.utils";
import { HotkeyBadge } from "../common/HotkeyBadge";
import { HotkeySetting } from "../settings/HotkeySetting";

const PAGE_COUNT = 3;

const IntroPage = () => {
  return (
    <Stack spacing={3} alignItems="center" textAlign="center" py={2}>
      <Box
        sx={{
          width: 80,
          height: 80,
          borderRadius: "50%",
          background: "linear-gradient(135deg, #0EA5E9 0%, #3B82F6 100%)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          boxShadow: "0 8px 32px rgba(59, 130, 246, 0.4)",
        }}
      >
        <AutoAwesome sx={{ fontSize: 40, color: "white" }} />
      </Box>
      <Stack spacing={1} alignItems="center">
        <Stack direction="row" spacing={1} alignItems="center">
          <Typography variant="h5" fontWeight={600}>
            <FormattedMessage defaultMessage="Introducing Agent Mode" />
          </Typography>
          <Chip label="Beta" size="small" color="primary" />
        </Stack>
        <Typography variant="body1" color="text.secondary">
          <FormattedMessage defaultMessage="A powerful new way to interact with your text" />
        </Typography>
      </Stack>
      <Stack spacing={2} textAlign="left" sx={{ maxWidth: 480 }}>
        <Typography variant="body2" color="text.secondary">
          <FormattedMessage defaultMessage="Agent Mode lets you give voice commands to write, edit, or transform text. Instead of just dictating, you can now tell the AI what you want it to do." />
        </Typography>
        <Typography variant="body2" color="text.secondary">
          <FormattedMessage defaultMessage="Try commands like 'Write an email to Bob about the meeting' or 'Make this paragraph more formal'. Agent Mode reads what's in your text field and rewrites it based on your instructions." />
        </Typography>
        <Typography variant="body2" color="text.secondary">
          <FormattedMessage defaultMessage="Run it multiple times to refine your text until it's perfect." />
        </Typography>
      </Stack>
    </Stack>
  );
};

const HotkeyPage = () => {
  return (
    <Stack spacing={3} py={4} px={2}>
      <Stack spacing={1} textAlign="center">
        <Typography variant="h5" fontWeight={600}>
          <FormattedMessage defaultMessage="Set Your Shortcut" />
        </Typography>
        <Typography variant="body2" color="text.secondary">
          <FormattedMessage defaultMessage="Choose the keyboard shortcut you'll use to activate Agent Mode" />
        </Typography>
      </Stack>
      <Box sx={{ pt: 2 }}>
        <HotkeySetting
          title={<FormattedMessage defaultMessage="Agent Mode shortcut" />}
          description={
            <FormattedMessage defaultMessage="Press this shortcut to start and stop Agent Mode anywhere on your computer." />
          }
          actionName={AGENT_DICTATE_HOTKEY}
          buttonSize="medium"
        />
      </Box>
    </Stack>
  );
};

const TryItPage = () => {
  const intl = useIntl();
  const [value, setValue] = useState("");
  const combos = useAppStore((state) =>
    getHotkeyCombosForAction(state, AGENT_DICTATE_HOTKEY),
  );

  const handleChange = (
    event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    setValue(event.target.value);
  };

  const hotkeys = (
    <>
      {combos.map((combo, index) => {
        const key = combo.join("|");
        const isLast = index === combos.length - 1;
        const separator = (() => {
          if (isLast) {
            return "";
          }
          if (combos.length === 2) {
            return " or ";
          }
          if (index === combos.length - 2) {
            return ", or ";
          }
          return ", ";
        })();

        return (
          <Fragment key={key}>
            <HotkeyBadge keys={combo} sx={{ mx: 0.25 }} />
            {separator}
          </Fragment>
        );
      })}
    </>
  );

  return (
    <Stack spacing={3} py={4} px={2}>
      <Stack spacing={1} textAlign="center">
        <Typography variant="h5" fontWeight={600}>
          <FormattedMessage defaultMessage="Give It a Try!" />
        </Typography>
        <Typography variant="body2" color="text.secondary">
          <FormattedMessage defaultMessage="Test out Agent Mode right now" />
        </Typography>
      </Stack>
      <Typography variant="body2" color="text.secondary" component="div">
        <FormattedMessage
          defaultMessage="Press {hotkeys} and say something like 'Write an email to Bob about his shoes'."
          values={{ hotkeys }}
        />
      </Typography>
      <TextField
        autoFocus
        multiline
        minRows={4}
        fullWidth
        placeholder={intl.formatMessage({
          defaultMessage:
            'Try saying "Write an email to Bob about his shoes" or "Make this more casual"',
        })}
        value={value}
        onChange={handleChange}
      />
      <Typography variant="body2" color="text.secondary" fontStyle="italic">
        <FormattedMessage defaultMessage="Tip: Run Agent Mode multiple times to keep refining! It remembers what's in the text box." />
      </Typography>
    </Stack>
  );
};

export const FeatureReleaseDialog = () => {
  const lastSeenFeature = useAppStore(
    (state) => getMyUserPreferences(state)?.lastSeenFeature,
  );
  const hasConfettiFired = useRef(false);
  const [pageIndex, setPageIndex] = useState(0);

  const open = lastSeenFeature !== CURRENT_FEATURE;

  useEffect(() => {
    if (open && !hasConfettiFired.current) {
      hasConfettiFired.current = true;
      showConfetti();
    }
  }, [open]);

  const handleDismiss = async () => {
    await markFeatureSeen(CURRENT_FEATURE);
  };

  const handleNext = () => {
    setPageIndex((prev) => Math.min(PAGE_COUNT - 1, prev + 1));
  };

  const handleBack = () => {
    setPageIndex((prev) => Math.max(0, prev - 1));
  };

  if (!open) {
    return null;
  }

  const canBack = pageIndex > 0;
  const isLastPage = pageIndex === PAGE_COUNT - 1;

  return (
    <Dialog open={open} fullWidth maxWidth="sm">
      <DialogContent sx={{ px: 2, py: 1 }}>
        {pageIndex === 0 && <IntroPage />}
        {pageIndex === 1 && <HotkeyPage />}
        {pageIndex === 2 && <TryItPage />}
      </DialogContent>
      <DialogActions sx={{ justifyContent: "space-between", px: 2, pb: 2 }}>
        {canBack ? (
          <Button onClick={handleBack}>
            <FormattedMessage defaultMessage="Back" />
          </Button>
        ) : (
          <div />
        )}
        {isLastPage ? (
          <Button onClick={handleDismiss} variant="contained">
            <FormattedMessage defaultMessage="Got it!" />
          </Button>
        ) : (
          <Button
            variant="contained"
            endIcon={<ArrowForward />}
            onClick={handleNext}
          >
            <FormattedMessage defaultMessage="Next" />
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
};
