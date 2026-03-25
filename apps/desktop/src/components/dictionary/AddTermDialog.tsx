import { ArrowDownwardOutlined } from "@mui/icons-material";
import CheckRoundedIcon from "@mui/icons-material/CheckRounded";
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  Switch,
  TextField,
  Typography,
} from "@mui/material";
import { useCallback, useEffect, useMemo, useState } from "react";
import { FormattedMessage, useIntl } from "react-intl";

type AddTermDialogProps = {
  open: boolean;
  onClose: () => void;
  onAddGlossaryTerms: (terms: string[]) => void;
  onAddReplacement: (source: string, destination: string) => void;
};

export const AddTermDialog = ({
  open,
  onClose,
  onAddGlossaryTerms,
  onAddReplacement,
}: AddTermDialogProps) => {
  const intl = useIntl();
  const [isReplacement, setIsReplacement] = useState(false);
  const [glossaryText, setGlossaryText] = useState("");
  const [sourceValue, setSourceValue] = useState("");
  const [destinationValue, setDestinationValue] = useState("");

  useEffect(() => {
    if (open) {
      setIsReplacement(false);
      setGlossaryText("");
      setSourceValue("");
      setDestinationValue("");
    }
  }, [open]);

  const glossaryTerms = useMemo(
    () =>
      glossaryText
        .split("\n")
        .map((line) => line.trim())
        .filter((line) => line.length > 0),
    [glossaryText],
  );

  const canSave = isReplacement
    ? sourceValue.trim().length > 0 && destinationValue.trim().length > 0
    : glossaryTerms.length > 0;

  const handleSave = useCallback(() => {
    if (!canSave) return;

    if (isReplacement) {
      onAddReplacement(sourceValue.trim(), destinationValue.trim());
    } else {
      onAddGlossaryTerms(glossaryTerms);
    }
    onClose();
  }, [
    canSave,
    isReplacement,
    sourceValue,
    destinationValue,
    glossaryTerms,
    onAddReplacement,
    onAddGlossaryTerms,
    onClose,
  ]);

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        <Box sx={{ display: "flex", alignItems: "center" }}>
          <Typography variant="h6" sx={{ flex: 1 }}>
            <FormattedMessage defaultMessage="Add term" />
          </Typography>
          <Stack direction="row" alignItems="center" spacing={1}>
            <Typography variant="body2" color="text.secondary">
              <FormattedMessage defaultMessage="Replacement" />
            </Typography>
            <Switch
              size="small"
              checked={isReplacement}
              onChange={(_, checked) => setIsReplacement(checked)}
            />
          </Stack>
        </Box>
      </DialogTitle>

      <DialogContent dividers>
        {isReplacement ? (
          <Stack spacing={1} sx={{ pt: 1 }}>
            <TextField
              autoFocus
              fullWidth
              placeholder={intl.formatMessage({
                defaultMessage: "Original term",
              })}
              value={sourceValue}
              onChange={(e) => setSourceValue(e.target.value)}
            />
            <Stack
              direction="row"
              alignItems="center"
              spacing={1}
              sx={{ pl: 2 }}
            >
              <ArrowDownwardOutlined color="action" fontSize="small" />
              <Typography variant="body2" color="text.secondary">
                <FormattedMessage defaultMessage="Replace with" />
              </Typography>
            </Stack>
            <TextField
              fullWidth
              placeholder={intl.formatMessage({
                defaultMessage: "Replacement term",
              })}
              value={destinationValue}
              onChange={(e) => setDestinationValue(e.target.value)}
            />
          </Stack>
        ) : (
          <TextField
            autoFocus
            fullWidth
            multiline
            minRows={3}
            placeholder={intl.formatMessage({
              defaultMessage: "Enter a term",
            })}
            value={glossaryText}
            onChange={(e) => setGlossaryText(e.target.value)}
            helperText={
              <FormattedMessage defaultMessage="Add multiple terms at once by putting each on a new line." />
            }
            sx={{ pt: 1 }}
          />
        )}
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button variant="text" onClick={onClose}>
          <FormattedMessage defaultMessage="Cancel" />
        </Button>
        <Button
          variant="contained"
          startIcon={<CheckRoundedIcon />}
          onClick={handleSave}
          disabled={!canSave}
        >
          {!isReplacement && glossaryTerms.length > 1 ? (
            <FormattedMessage
              defaultMessage="Add ({count})"
              values={{ count: glossaryTerms.length }}
            />
          ) : (
            <FormattedMessage defaultMessage="Add" />
          )}
        </Button>
      </DialogActions>
    </Dialog>
  );
};
