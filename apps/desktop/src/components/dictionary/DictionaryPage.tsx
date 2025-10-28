import { firemix } from "@firemix/client";
import AddRoundedIcon from "@mui/icons-material/AddRounded";
import { Button } from "@mui/material";
import { Term } from "@repo/types";
import { useCallback } from "react";
import { showErrorSnackbar } from "../../actions/app.actions";
import { getTermRepo } from "../../repos";
import { getAppState, produceAppState, useAppStore } from "../../store";
import { getMyUserId } from "../../utils/user.utils";
import { VirtualizedListPage } from "../common/VirtualizedListPage";
import { DictionaryRow } from "./DictionaryRow";
import { MenuPopoverBuilder } from "../common/MenuPopover";
import { FindReplaceOutlined, SpellcheckOutlined } from "@mui/icons-material";

export default function DictionaryPage() {
  const termIds = useAppStore((state) => state.dictionary.termIds);

  const handleAddTerm = useCallback(async (replacement: boolean) => {
    const newTerm: Term = {
      id: firemix().id(),
      createdAt: firemix().now(),
      createdByUserId: getMyUserId(getAppState()),
      sourceValue: "",
      destinationValue: "",
      isReplacement: replacement,
      isDeleted: false,
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
    } catch (error) {
      produceAppState((draft) => {
        delete draft.termById[newTerm.id];
        draft.dictionary.termIds = draft.dictionary.termIds.filter(
          (termId) => termId !== newTerm.id
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
          title: "Glossary term",
          onClick: ({ close }) => {
            handleAddTerm(false);
            close();
          },
          leading: <SpellcheckOutlined />,
        },
        {
          kind: "listItem",
          title: "Replacement rule",
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
          Add
        </Button>
      )}
    </MenuPopoverBuilder>
  );

  return (
    <VirtualizedListPage
      title="Dictionary"
      subtitle="Voquill may misunderstand you on occasion. If you see certain words being missed frequently, you can define a replacement rule here to fix the spelling automatically."
      action={addButton}
      items={termIds}
      computeItemKey={(id) => id}
      heightMult={10}
      renderItem={(id) => <DictionaryRow key={id} id={id} />}
    />
  );
}
