
import { Contact, DelayedAction, Member, Nullable, PartialConfig, Usage, User } from "@repo/types";
import { listify } from "@repo/utilities";
import { FiremixPath } from "@firemix/core";

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

export const usageByIp = (ip?: Nullable<string>): FiremixPath<Usage> => {
  return ["demoUsageByIp", ...listify(ip)];
};

export const usageByBrowserId = (
  browserId?: Nullable<string>
): FiremixPath<Usage> => {
  return ["demoUsageByBrowserId", ...listify(browserId)];
};
