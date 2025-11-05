import { firemix } from "@firemix/client";
import { mixpath } from "@repo/firemix";
import { Term } from "@repo/types";
import { getRec } from "@repo/utilities";
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
  createdByUserId: "",
  sourceValue: term.sourceValue,
  destinationValue: term.destinationValue,
  isReplacement: term.isReplacement,
  isDeleted: false,
});

const fromLocalTerm = (term: LocalTerm): Term => ({
  id: term.id,
  createdAt: firemix().timestampFromMillis(term.createdAt),
  sourceValue: term.sourceValue,
  destinationValue: term.destinationValue,
  isReplacement: term.isReplacement,
});

export abstract class BaseTermRepo extends BaseRepo {
  abstract listTerms(userId: string): Promise<Term[]>;
  abstract createTerm(userId: string, term: Term): Promise<Term>;
  abstract updateTerm(userId: string, term: Term): Promise<Term>;
  abstract deleteTerm(userId: string, termId: string): Promise<void>;
}

export class LocalTermRepo extends BaseTermRepo {
  async listTerms(): Promise<Term[]> {
    const terms = await invoke<LocalTerm[]>("term_list");
    return terms.map(fromLocalTerm);
  }

  async createTerm(_: string, term: Term): Promise<Term> {
    const created = await invoke<LocalTerm>("term_create", {
      term: toLocalTerm(term),
    });
    return fromLocalTerm(created);
  }

  async updateTerm(_: string, term: Term): Promise<Term> {
    const updated = await invoke<LocalTerm>("term_update", {
      term: toLocalTerm(term),
    });
    return fromLocalTerm(updated);
  }

  async deleteTerm(_: string, termId: string): Promise<void> {
    await invoke<void>("term_delete", { id: termId });
  }
}

export class CloudTermRepo extends BaseTermRepo {
  async listTerms(userId: string): Promise<Term[]> {
    const doc = await firemix().get(mixpath.terms(userId));
    const termIds = doc?.data.termIds ?? [];
    const terms = termIds.map((id) => getRec(doc?.data.termById, id));
    return terms.filter(Boolean).map((t) => t as Term);
  }

  async createTerm(userId: string, term: Term): Promise<Term> {
    await firemix().merge(mixpath.terms(term.id), {
      id: userId,
      termIds: firemix().arrayUnion([term.id]),
      termById: {
        [term.id]: term,
      },
    });
    return term;
  }

  async updateTerm(userId: string, term: Term): Promise<Term> {
    await firemix().merge(mixpath.terms(userId), {
      termById: {
        [term.id]: term,
      },
    });
    return term;
  }

  async deleteTerm(userId: string, termId: string): Promise<void> {
    await firemix().merge(mixpath.terms(userId), {
      termIds: firemix().arrayRemove([termId]),
      termById: {
        [termId]: firemix().deleteField(),
      },
    });
  }
}
