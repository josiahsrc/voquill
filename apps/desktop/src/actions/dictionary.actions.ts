import { getTermRepo } from "../repos";
import { produceAppState } from "../store";
import { registerTerms } from "../utils/app.utils";

export const loadDictionary = async (): Promise<void> => {
  const terms = await getTermRepo().listTerms();

  const activeTerms = terms
    .filter((term) => !term.isDeleted)
    .sort((a, b) => b.createdAt.toMillis() - a.createdAt.toMillis());

  produceAppState((draft) => {
    registerTerms(draft, terms);
    draft.dictionary.termIds = activeTerms.map((term) => term.id);
  });
}