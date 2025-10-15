import stripe from "stripe";
import { blaze, Member, Nullable, path } from "../shared";
import { getStripeSecretKey } from "./env.utils";
import { ClientError } from "./error.utils";

export const getStripe = () => {
  const secret = getStripeSecretKey();
  if (!secret) {
    return null;
  }

  return new stripe(secret);
}

export type GetMemberArgs = {
  metadata?: stripe.Metadata;
  customer?: string | stripe.Customer | stripe.DeletedCustomer;
};

export const getMember = async (
  metadata?: Nullable<stripe.Metadata>
): Promise<Member> => {
  const userId = metadata?.userId;
  if (!userId) {
    console.error("cannot find member, no userId provided in metadata");
    throw new ClientError("no userId provided");
  }

  const member = await firemix().get(path.members(userId));
  if (!member) {
    console.log("no member found for userId", userId);
    throw new Error("member not found");
  }

  return member.data;
};
