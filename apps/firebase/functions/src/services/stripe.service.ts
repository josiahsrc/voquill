import { AuthData } from "firebase-functions/tasks";
import stripe from "stripe";
import { HandlerInput, HandlerOutput } from "@repo/functions";
import { ClientError, UnauthenticatedError } from "../utils/error.utils";
import { getMember, getStripe } from "../utils/stripe.utils";
import { firemix } from "@firemix/mixed";
import { Nullable } from "@repo/types";
import { mixpath } from "@repo/firemix";
import { getRec } from "@repo/utilities";
import { priceKeyById } from "@repo/pricing";

export const createCheckoutSession = async (args: {
  auth: Nullable<AuthData>;
  origin: string;
  input: HandlerInput<"stripe/createCheckoutSession">;
}): Promise<HandlerOutput<"stripe/createCheckoutSession">> => {
  const stripe = getStripe();
  if (!stripe) {
    console.log("no stripe secret key provided");
    throw new Error("Stripe is not configured");
  }

  if (!args.auth) {
    console.log("no auth data provided");
    throw new UnauthenticatedError("You must be authenticated");
  }

  if (!args.origin) {
    console.log("no origin provided");
    throw new UnauthenticatedError("You must be authenticated");
  }

  const { priceId } = args.input;
  if (!priceId) {
    console.log("no price ID provided");
    throw new UnauthenticatedError("No price ID provided");
  }

  const metadata = {
    userId: args.auth.uid,
    priceId,
  };

  const priceKey = getRec(priceKeyById, priceId);
  if (!priceKey) {
    console.log("invalid price ID provided", priceId);
    throw new ClientError("Invalid price ID provided");
  }

  const mode: stripe.Checkout.SessionCreateParams.Mode = "subscription";
  const subscription_data:
    | stripe.Checkout.SessionCreateParams.SubscriptionData
    | undefined = {
    metadata,
  };

  const session = await stripe.checkout.sessions.create({
    ui_mode: "embedded",
    payment_method_options: {
      card: {
        request_three_d_secure: "automatic",
      },
    },
    line_items: [
      {
        price: priceId,
        quantity: 1,
      },
    ],
    mode,
    redirect_on_completion: "never",
    metadata,
    subscription_data,
  });

  if (!session.client_secret) {
    console.log("session.client_secret is undefined");
    throw new Error("Failed to create checkout session");
  }

  return {
    sessionId: session.id,
    clientSecret: session.client_secret,
  };
};

export const handleGetPrices = async (args: {
  input: HandlerInput<"stripe/getPrices">;
}): Promise<HandlerOutput<"stripe/getPrices">> => {
  const stripe = getStripe();
  if (!stripe) {
    return { prices: {} };
  }

  const stripePrices = await Promise.all(
    args.input.priceIds.map((priceId) => stripe.prices.retrieve(priceId))
  );

  const priceMap: Record<
    string,
    HandlerOutput<"stripe/getPrices">["prices"][string]
  > = {};
  for (const price of stripePrices) {
    priceMap[price.id] = {
      unitAmount: price.unit_amount ?? null,
      unitAmountDecimal: price.unit_amount_decimal ?? null,
      currency: price.currency,
    };
  }

  return {
    prices: priceMap,
  };
};

export const handleSubscriptionCreated = async (
  event: stripe.CustomerSubscriptionCreatedEvent
) => {
  const member = await getMember(event.data.object.metadata);

  const priceId = event.data.object.items.data[0]?.price?.id;
  if (!priceId) {
    console.log("no price id found on subscription");
    throw new Error("no price id found on subscription");
  }

  console.log("subscribing member", member.id, "to price", priceId);
  await firemix().update(mixpath.members(member.id), {
    plan: "pro",
    updatedAt: firemix().now(),
    priceId,
    stripeCustomerId: event.data.object.customer as string,
  });
};

export const handleSubscriptionDeleted = async (
  event: stripe.CustomerSubscriptionDeletedEvent
) => {
  const member = await getMember(event.data.object.metadata);
  await firemix().update(mixpath.members(member.id), {
    plan: "free",
    priceId: null,
    updatedAt: firemix().now(),
  });
};

export const createCustomerPortalSession = async (args: {
  origin: string;
  auth: Nullable<AuthData>;
}): Promise<HandlerOutput<"stripe/createCustomerPortalSession">> => {
  const stripe = getStripe();
  if (!stripe) {
    console.log("no stripe secret key provided");
    throw new Error("Stripe is not configured");
  }

  if (!args.auth) {
    console.log("no auth data provided");
    throw new UnauthenticatedError("You must be authenticated");
  }

  const member = await getMember({ userId: args.auth.uid });
  if (!member) {
    console.log("no member found for user", args.auth.uid);
    throw new ClientError("No member found for user");
  }

  if (!member.stripeCustomerId) {
    console.log("no stripe customer ID found for member", member.id);
    throw new ClientError("No stripe customer ID found for member");
  }

  const session = await stripe.billingPortal.sessions.create({
    customer: member.stripeCustomerId,
    return_url: `${args.origin}/account`,
  });

  return { url: session.url };
};

export const cancelUserSubscriptions = async (args: {
  userId: string;
}): Promise<void> => {
  const stripe = getStripe();
  if (!stripe) {
    console.log("no stripe secret key provided");
    throw new Error("Stripe is not configured");
  }

  const member = await getMember({ userId: args.userId });
  if (!member) {
    console.log("no member found for user", args.userId);
    return;
  }

  if (!member.stripeCustomerId) {
    console.log("no stripe customer ID found for member", member.id);
    return;
  }

  const subscriptions = await stripe.subscriptions.list({
    customer: member.stripeCustomerId,
    status: "active",
  });

  if (subscriptions.data.length === 0) {
    console.log("no active subscriptions found for member", member.id);
    return;
  }

  for (const subscription of subscriptions.data) {
    console.log("cancelling sub", subscription.id, "for member", member.id);
    await stripe.subscriptions.cancel(subscription.id, {
      expand: ["latest_invoice.payment_intent"],
    });
  }

  console.log("cancelled all active subscriptions for member", member.id);
};
