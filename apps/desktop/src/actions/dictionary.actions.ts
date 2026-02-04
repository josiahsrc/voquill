import dayjs from "dayjs";
import { getTermRepo } from "../repos";
import { produceAppState } from "../store";
import { registerTerms } from "../utils/app.utils";

export const loadDictionary = async (): Promise<void> => {
  const terms = await getTermRepo().listTerms();
  const activeTerms = terms.sort(
    (a, b) => dayjs(b.createdAt).valueOf() - dayjs(a.createdAt).valueOf(),
  );

  produceAppState((draft) => {
    registerTerms(draft, terms);
    draft.dictionary.termIds = activeTerms.map((term) => term.id);
  });
};
