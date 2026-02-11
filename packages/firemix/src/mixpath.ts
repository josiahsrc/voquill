import { FiremixPath } from "@firemix/core";
import {
  Contact,
  DatabaseApiRefreshToken,
  DatabaseMember,
  DatabaseUser,
  Nullable,
  TermDoc,
  ToneDoc,
  Transcription,
} from "@repo/types";
import { listify } from "@repo/utilities";

export const members = (
  memberId?: Nullable<string>,
): FiremixPath<DatabaseMember> => {
  return ["members", ...listify(memberId)];
};

export const users = (userId?: Nullable<string>): FiremixPath<DatabaseUser> => {
  return ["users", ...listify(userId)];
};

export const contacts = (
  contactId?: Nullable<string>,
): FiremixPath<Contact> => {
  return ["contacts", ...listify(contactId)];
};

export const transcriptions = (
  transcriptionId?: Nullable<string>,
): FiremixPath<Transcription> => {
  return ["transcriptions", ...listify(transcriptionId)];
};

export const termDocs = (userId: Nullable<string>): FiremixPath<TermDoc> => {
  return ["termDocs", ...listify(userId)];
};

export const toneDocs = (userId: Nullable<string>): FiremixPath<ToneDoc> => {
  return ["toneDocs", ...listify(userId)];
};

export const apiRefreshTokens = (
  tokenHash?: Nullable<string>,
): FiremixPath<DatabaseApiRefreshToken> => {
  return ["apiRefreshTokens", ...listify(tokenHash)];
};
