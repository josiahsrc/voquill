import ArrowForwardRoundedIcon from "@mui/icons-material/ArrowForwardRounded";
import DeleteOutlineRoundedIcon from "@mui/icons-material/DeleteOutlineRounded";
import { IconButton, Stack, TextField } from "@mui/material";
import { getRec } from "@repo/utilities";
import { useCallback, useEffect, useState, type ChangeEvent } from "react";
import { showErrorSnackbar } from "../../actions/app.actions";
import { getTermRepo } from "../../repos";
import { getAppState, produceAppState, useAppStore } from "../../store";

export type DictionaryRowProps = {
  id: string;
};

export const DictionaryRow = ({ id }: DictionaryRowProps) => {
  const term = useAppStore((state) => getRec(state.termById, id));
  const [sourceValue, setSourceValue] = useState(term?.sourceValue ?? "");
  const [destinationValue, setDestinationValue] = useState(
    term?.destinationValue ?? ""
  );
  const isReplacement = term?.isReplacement ?? true;

  useEffect(() => {
    setSourceValue(term?.sourceValue ?? "");
    setDestinationValue(term?.destinationValue ?? "");
  }, [term?.sourceValue, term?.destinationValue]);

  const handleFieldChange =
    (field: "source" | "destination") =>
    (event: ChangeEvent<HTMLInputElement>) => {
      if (field === "source") {
        setSourceValue(event.target.value);
      } else {
        setDestinationValue(event.target.value);
      }
    };

  const handleCommit = useCallback(async () => {
    if (!term) {
      return;
    }

    if (
      term.sourceValue === sourceValue &&
      term.destinationValue === destinationValue
    ) {
      return;
    }

    const previousTerm = term;
    const updatedTerm = {
      ...term,
      sourceValue,
      destinationValue,
    };

    produceAppState((draft) => {
      draft.termById[id] = updatedTerm;
    });

    try {
      await getTermRepo().updateTerm(updatedTerm);
    } catch (error) {
      produceAppState((draft) => {
        draft.termById[id] = previousTerm;
      });
      setSourceValue(previousTerm.sourceValue);
      setDestinationValue(previousTerm.destinationValue);
      showErrorSnackbar(error);
    }
  }, [destinationValue, id, sourceValue, term]);

  const handleDelete = useCallback(async () => {
    if (!term) {
      return;
    }

    const previousTerm = term;
    const previousIds = [...getAppState().dictionary.termIds];

    produceAppState((draft) => {
      draft.dictionary.termIds = draft.dictionary.termIds.filter(
        (termId) => termId !== id
      );
    });

    try {
      await getTermRepo().deleteTerm(id);
    } catch (error) {
      produceAppState((draft) => {
        draft.termById[id] = previousTerm;
        draft.dictionary.termIds = previousIds;
      });
      setSourceValue(previousTerm.sourceValue);
      setDestinationValue(previousTerm.destinationValue);
      showErrorSnackbar(error);
    }
  }, [id, term]);

  if (!term) {
    return null;
  }

  return (
    <Stack direction="row" spacing={2} alignItems="center" py={1}>
      <TextField
        variant="outlined"
        size="small"
        placeholder={isReplacement ? "Original" : "Glossary term"}
        value={sourceValue}
        onChange={handleFieldChange("source")}
        onBlur={handleCommit}
        sx={{ flex: 1 }}
        error={sourceValue.trim() === ""}
      />
      {isReplacement ? (
        <>
          <ArrowForwardRoundedIcon color="action" fontSize="small" />
          <TextField
            variant="outlined"
            size="small"
            placeholder="Replacement"
            value={destinationValue}
            onChange={handleFieldChange("destination")}
            onBlur={handleCommit}
            multiline
            minRows={1}
            sx={{ flex: 1 }}
            error={destinationValue.trim() === ""}
          />
        </>
      ) : null}
      <IconButton
        aria-label={`Delete dictionary item ${term.sourceValue}`}
        onClick={handleDelete}
        size="small"
      >
        <DeleteOutlineRoundedIcon fontSize="small" />
      </IconButton>
    </Stack>
  );
};
