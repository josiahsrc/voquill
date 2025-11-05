
import { FiremixPath } from "@firemix/core";
import { Contact, DelayedAction, Member, Nullable, PartialConfig, Term, Transcription, User } from "@repo/types";
import { listify } from "@repo/utilities";

export const members = (memberId?: Nullable<string>): FiremixPath<Member> => {
  return ["members", ...listify(memberId)];
};

export const users = (userId?: Nullable<string>): FiremixPath<User> => {
  return ["users", ...listify(userId)];
};

export const contacts = (contactId?: Nullable<string>): FiremixPath<Contact> => {
  return ["contacts", ...listify(contactId)];
};

export const systemConfig = (): FiremixPath<PartialConfig> => {
  return ["system", "config"];
};

export const delayedActions = (
  delayedActionId?: Nullable<string>
): FiremixPath<DelayedAction> => {
  return ["delayedActions", ...listify(delayedActionId)];
};

export const transcriptions = (transcriptionId?: Nullable<string>): FiremixPath<Transcription> => {
  return ["transcriptions", ...listify(transcriptionId)];
}

export const terms = (userId: string, termId?: Nullable<string>): FiremixPath<Term> => {
  return ["users", userId, "terms", ...listify(termId)];
}
