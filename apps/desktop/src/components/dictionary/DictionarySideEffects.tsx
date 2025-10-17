import { useAsyncEffect } from "../../hooks/async.hooks";
import { useOnExit } from "../../hooks/helper.hooks";
import { getTermRepo } from "../../repos";
import { INITIAL_DICTIONARY_STATE } from "../../state/dictionary.state";
import { produceAppState } from "../../store";
import { registerTerms } from "../../utils/app.utils";

export const DictionarySideEffects = () => {
  useAsyncEffect(async () => {
    const terms = await getTermRepo().listTerms();

    const activeTerms = terms
      .filter((term) => !term.isDeleted)
      .sort((a, b) => b.createdAt.toMillis() - a.createdAt.toMillis());

    produceAppState((draft) => {
      registerTerms(draft, terms);
      draft.dictionary.termIds = activeTerms.map((term) => term.id);
    });
  }, []);

  useOnExit(() => {
    produceAppState((draft) => {
      Object.assign(draft.dictionary, INITIAL_DICTIONARY_STATE);
    });
  });

  return null;
};
