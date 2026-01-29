import type { Term } from "@repo/types";
import { invoke } from "../utils/api.utils";
import { produceAppState } from "../store";
import { registerTerms } from "../utils/app.utils";

export async function loadGlobalTerms() {
  produceAppState((draft) => {
    draft.terms.status = "loading";
  });

  try {
    const data = await invoke("term/listGlobalTerms", {});
    produceAppState((draft) => {
      registerTerms(draft, data.terms);
      draft.terms.termIds = data.terms.map((t) => t.id);
      draft.terms.status = "success";
    });
  } catch {
    produceAppState((draft) => {
      draft.terms.status = "error";
    });
  }
}

export async function upsertGlobalTerm(term: Term) {
  await invoke("term/upsertGlobalTerm", { term });
  produceAppState((draft) => {
    registerTerms(draft, [term]);
    if (!draft.terms.termIds.includes(term.id)) {
      draft.terms.termIds.unshift(term.id);
    }
  });
}

export async function deleteGlobalTerm(termId: string) {
  await invoke("term/deleteGlobalTerm", { termId });
  produceAppState((draft) => {
    draft.terms.termIds = draft.terms.termIds.filter((id) => id !== termId);
    delete draft.termById[termId];
  });
}
