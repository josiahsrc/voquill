import { DatabaseMember, Nullable } from "@repo/types";
import stripe from "stripe";
import { getStripeSecretKey } from "./env.utils";
import { ClientError } from "./error.utils";
import { tryInitializeMember } from "./member.utils";

export const getStripe = () => {
  const secret = getStripeSecretKey();
  if (!secret) {
    return null;
  }

  return new stripe(secret);
}

export type GetStripDatabaseMember = {
  metadata?: stripe.Metadata;
  customer?: string | stripe.Customer | stripe.DeletedCustomer;
};

export const getOrCreateStripeDatabaseMember = async (
  metadata?: Nullable<stripe.Metadata>
): Promise<DatabaseMember> => {
  const userId = metadata?.userId;
  if (!userId) {
    console.error("cannot find member, no userId provided in metadata");
    throw new ClientError("no userId provided");
  }

  const member = await tryInitializeMember(userId);
  return member;
};
