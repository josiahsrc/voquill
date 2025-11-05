import { getTermRepo } from "../repos";
import { getAppState, produceAppState } from "../store";
import { registerTerms } from "../utils/app.utils";

export const loadDictionary = async (): Promise<void> => {
  const userId = getAppState().auth?.uid;
  if (!userId) {
    return;
  }

  const terms = await getTermRepo().listTerms(userId);

  const activeTerms = terms
    .sort((a, b) => b.createdAt.toMillis() - a.createdAt.toMillis());
  console.log("activeTerms", activeTerms);

  produceAppState((draft) => {
    registerTerms(draft, terms);
    draft.dictionary.termIds = activeTerms.map((term) => term.id);
  });
}