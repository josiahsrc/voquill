import AddRoundedIcon from "@mui/icons-material/AddRounded";
import { Button } from "@mui/material";
import { Term } from "@repo/types";
import dayjs from "dayjs";
import { useCallback, useState } from "react";
import { FormattedMessage } from "react-intl";
import { showErrorSnackbar } from "../../actions/app.actions";
import { loadDictionary } from "../../actions/dictionary.actions";
import { setLocalStorageValue } from "../../actions/local-storage.actions";
import { useAsyncEffect } from "../../hooks/async.hooks";
import { getTermRepo } from "../../repos";
import { produceAppState, useAppStore } from "../../store";
import { createId } from "../../utils/id.utils";
import { VirtualizedListPage } from "../common/VirtualizedListPage";
import { AddTermDialog } from "./AddTermDialog";
import { DictionaryRow } from "./DictionaryRow";

export default function DictionaryPage() {
  const termIds = useAppStore((state) => state.dictionary.termIds);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);

  useAsyncEffect(async () => {
    await loadDictionary();
  }, []);

  const addTerm = useCallback(
    async (
      sourceValue: string,
      destinationValue: string,
      replacement: boolean,
    ) => {
      const newTerm: Term = {
        id: createId(),
        createdAt: dayjs().toISOString(),
        sourceValue,
        destinationValue,
        isReplacement: replacement,
      };

      produceAppState((draft) => {
        draft.termById[newTerm.id] = newTerm;
        draft.dictionary.termIds = [newTerm.id, ...draft.dictionary.termIds];
      });

      try {
        const created = await getTermRepo().createTerm(newTerm);
        produceAppState((draft) => {
          draft.termById[created.id] = created;
        });
        setLocalStorageValue("voquill:checklist-dictionary", true);
      } catch (error) {
        produceAppState((draft) => {
          delete draft.termById[newTerm.id];
          draft.dictionary.termIds = draft.dictionary.termIds.filter(
            (termId) => termId !== newTerm.id,
          );
        });
        showErrorSnackbar(error);
      }
    },
    [],
  );

  const handleAddGlossaryTerms = useCallback(
    async (terms: string[]) => {
      for (const term of terms) {
        await addTerm(term, "", false);
      }
    },
    [addTerm],
  );

  const handleAddReplacement = useCallback(
    async (source: string, destination: string) => {
      await addTerm(source, destination, true);
    },
    [addTerm],
  );

  return (
    <>
      <VirtualizedListPage
        title={<FormattedMessage defaultMessage="Dictionary" />}
        subtitle={
          <FormattedMessage defaultMessage="Voquill may misunderstand you on occasion. If you see certain words being missed frequently, you can define a replacement rule here to fix the spelling automatically." />
        }
        action={
          <Button
            variant="text"
            startIcon={<AddRoundedIcon />}
            onClick={() => setIsAddDialogOpen(true)}
          >
            <FormattedMessage defaultMessage="Add" />
          </Button>
        }
        items={termIds}
        computeItemKey={(id) => id}
        heightMult={10}
        renderItem={(id) => <DictionaryRow key={id} id={id} />}
      />
      <AddTermDialog
        open={isAddDialogOpen}
        onClose={() => setIsAddDialogOpen(false)}
        onAddGlossaryTerms={handleAddGlossaryTerms}
        onAddReplacement={handleAddReplacement}
      />
    </>
  );
}
