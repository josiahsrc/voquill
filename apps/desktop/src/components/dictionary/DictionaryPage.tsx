import { FindReplaceOutlined, SpellcheckOutlined } from "@mui/icons-material";
import AddRoundedIcon from "@mui/icons-material/AddRounded";
import { Button } from "@mui/material";
import { Term } from "@repo/types";
import dayjs from "dayjs";
import { useCallback } from "react";
import { FormattedMessage } from "react-intl";
import { showErrorSnackbar } from "../../actions/app.actions";
import { loadDictionary } from "../../actions/dictionary.actions";
import { setLocalStorageValue } from "../../actions/local-storage.actions";
import { useAsyncEffect } from "../../hooks/async.hooks";
import { getTermRepo } from "../../repos";
import { produceAppState, useAppStore } from "../../store";
import { createId } from "../../utils/id.utils";
import { MenuPopoverBuilder } from "../common/MenuPopover";
import { VirtualizedListPage } from "../common/VirtualizedListPage";
import { DictionaryRow } from "./DictionaryRow";

export default function DictionaryPage() {
  const termIds = useAppStore((state) => state.dictionary.termIds);

  useAsyncEffect(async () => {
    await loadDictionary();
  }, []);

  const handleAddTerm = useCallback(async (replacement: boolean) => {
    const newTerm: Term = {
      id: createId(),
      createdAt: dayjs().toISOString(),
      sourceValue: "",
      destinationValue: "",
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
  }, []);

  const addButton = (
    <MenuPopoverBuilder
      anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
      transformOrigin={{ vertical: "top", horizontal: "right" }}
      items={[
        {
          kind: "listItem",
          title: <FormattedMessage defaultMessage="Glossary term" />,
          onClick: ({ close }) => {
            handleAddTerm(false);
            close();
          },
          leading: <SpellcheckOutlined />,
        },
        {
          kind: "listItem",
          title: <FormattedMessage defaultMessage="Replacement rule" />,
          onClick: ({ close }) => {
            handleAddTerm(true);
            close();
          },
          leading: <FindReplaceOutlined />,
        },
      ]}
    >
      {(args) => (
        <Button
          variant="text"
          startIcon={<AddRoundedIcon />}
          onClick={args.open}
          ref={args.ref}
        >
          <FormattedMessage defaultMessage="Add" />
        </Button>
      )}
    </MenuPopoverBuilder>
  );

  return (
    <VirtualizedListPage
      title={<FormattedMessage defaultMessage="Dictionary" />}
      subtitle={
        <FormattedMessage defaultMessage="Voquill may misunderstand you on occasion. If you see certain words being missed frequently, you can define a replacement rule here to fix the spelling automatically." />
      }
      action={addButton}
      items={termIds}
      computeItemKey={(id) => id}
      heightMult={10}
      renderItem={(id) => <DictionaryRow key={id} id={id} />}
    />
  );
}
