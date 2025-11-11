import { firemix } from "@firemix/mixed";
import { mixpath } from "@repo/firemix";
import { HandlerInput, HandlerOutput } from "@repo/functions";
import { DatabaseTerm, Nullable } from "@repo/types";
import { AuthData } from "firebase-functions/tasks";
import { checkPaidAccess } from "../utils/check.utils";
import { termFromDatabase, termToDatabase } from "../utils/type.utils";

export const upsertMyTerm = async (args: {
  auth: Nullable<AuthData>;
  input: HandlerInput<"term/upsertMyTerm">;
}): Promise<HandlerOutput<"term/upsertMyTerm">> => {
  const access = await checkPaidAccess(args.auth);
  await firemix().merge(mixpath.termDocs(access.auth.uid), {
    id: access.auth.uid,
    termIds: firemix().arrayUnion(args.input.term.id),
    termById: {
      [args.input.term.id]: termToDatabase(args.input.term),
    },
  });

  return {};
}

export const deleteMyTerm = async (args: {
  auth: Nullable<AuthData>;
  input: HandlerInput<"term/deleteMyTerm">;
}): Promise<HandlerOutput<"term/deleteMyTerm">> => {
  const access = await checkPaidAccess(args.auth);
  await firemix().merge(mixpath.termDocs(access.auth.uid), {
    termIds: firemix().arrayRemove(args.input.termId),
    termById: {
      [args.input.termId]: firemix().deleteField(),
    },
  });

  return {};
}

export const listMyTerms = async (args: {
  auth: Nullable<AuthData>;
}): Promise<HandlerOutput<"term/listMyTerms">> => {
  const access = await checkPaidAccess(args.auth);
  const doc = await firemix().get(mixpath.termDocs(access.auth.uid));
  const termIds = doc?.data.termIds ?? [];
  const terms = termIds.map((id) => doc?.data.termById?.[id]).filter(Boolean);
  return {
    terms: terms.map((t) => termFromDatabase(t as DatabaseTerm)),
  };
}
