import { invokeHandler } from "@repo/functions";
import { Term } from "@repo/types";
import { invoke } from "@tauri-apps/api/core";
import dayjs from "dayjs";
import { invokeEnterprise } from "../utils/enterprise.utils";
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
  createdAt: dayjs(term.createdAt).valueOf(),
  createdByUserId: "",
  sourceValue: term.sourceValue,
  destinationValue: term.destinationValue,
  isReplacement: term.isReplacement,
  isDeleted: false,
});

const fromLocalTerm = (term: LocalTerm): Term => ({
  id: term.id,
  createdAt: dayjs(term.createdAt).toISOString(),
  sourceValue: term.sourceValue,
  destinationValue: term.destinationValue,
  isReplacement: term.isReplacement,
});

export abstract class BaseTermRepo extends BaseRepo {
  abstract listTerms(): Promise<Term[]>;
  abstract createTerm(term: Term): Promise<Term>;
  abstract updateTerm(term: Term): Promise<Term>;
  abstract deleteTerm(termId: string): Promise<void>;
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

  async deleteTerm(termId: string): Promise<void> {
    await invoke<void>("term_delete", { id: termId });
  }
}

export class CloudTermRepo extends BaseTermRepo {
  async listTerms(): Promise<Term[]> {
    const res = await invokeHandler("term/listMyTerms", {});
    return res.terms;
  }

  async createTerm(term: Term): Promise<Term> {
    await invokeHandler("term/upsertMyTerm", { term });
    return term;
  }

  async updateTerm(term: Term): Promise<Term> {
    await invokeHandler("term/upsertMyTerm", { term });
    return term;
  }

  async deleteTerm(termId: string): Promise<void> {
    await invokeHandler("term/deleteMyTerm", { termId });
  }
}

export class EnterpriseTermRepo extends BaseTermRepo {
  async listTerms(): Promise<Term[]> {
    const res = await invokeEnterprise("term/listMyTerms", {});
    return res.terms;
  }

  async createTerm(term: Term): Promise<Term> {
    await invokeEnterprise("term/upsertMyTerm", { term });
    return term;
  }

  async updateTerm(term: Term): Promise<Term> {
    await invokeEnterprise("term/upsertMyTerm", { term });
    return term;
  }

  async deleteTerm(termId: string): Promise<void> {
    await invokeEnterprise("term/deleteMyTerm", { termId });
  }
}
