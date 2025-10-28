import { firemix } from "@firemix/client";
import { Term } from "@repo/types";
import { invoke } from "@tauri-apps/api/core";
import { BaseRepo } from "./base.repo";

type LocalTerm = {
  id: string;
  createdAt: number;
  createdByUserId: string;
  sourceValue: string;
  destinationValue: string;
  isReplacement: boolean;
  isDeleted: boolean;
};

const toLocalTerm = (term: Term): LocalTerm => ({
  id: term.id,
  createdAt: term.createdAt.toMillis(),
  createdByUserId: term.createdByUserId,
  sourceValue: term.sourceValue,
  destinationValue: term.destinationValue,
  isReplacement: term.isReplacement,
  isDeleted: term.isDeleted,
});

const fromLocalTerm = (term: LocalTerm): Term => ({
  id: term.id,
  createdAt: firemix().timestampFromMillis(term.createdAt),
  createdByUserId: term.createdByUserId,
  sourceValue: term.sourceValue,
  destinationValue: term.destinationValue,
  isReplacement: term.isReplacement,
  isDeleted: term.isDeleted,
});

export abstract class BaseTermRepo extends BaseRepo {
  abstract listTerms(): Promise<Term[]>;
  abstract createTerm(term: Term): Promise<Term>;
  abstract updateTerm(term: Term): Promise<Term>;
  abstract deleteTerm(id: string): Promise<void>;
}

export class LocalTermRepo extends BaseTermRepo {
  async listTerms(): Promise<Term[]> {
    const terms = await invoke<LocalTerm[]>("term_list");
    return terms.map(fromLocalTerm);
  }

  async createTerm(term: Term): Promise<Term> {
    const created = await invoke<LocalTerm>("term_create", {
      term: toLocalTerm(term),
    });
    return fromLocalTerm(created);
  }

  async updateTerm(term: Term): Promise<Term> {
    const updated = await invoke<LocalTerm>("term_update", {
      term: toLocalTerm(term),
    });
    return fromLocalTerm(updated);
  }

  async deleteTerm(id: string): Promise<void> {
    await invoke<void>("term_delete", { id });
  }
}
