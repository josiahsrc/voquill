import { onRequest } from "firebase-functions/v2/https";
import stripe from "stripe";
import * as service from "../services/stripe.service";
import {
	getStripeWebhookSecret,
	STRIPE_WEBHOOK_SECRET_VAR,
} from "../utils/env.utils";
import { ClientError, wrapAsyncExpress } from "../utils/error.utils";

export const webhook = onRequest(
	{ secrets: [STRIPE_WEBHOOK_SECRET_VAR] },
	async (req, res) => {
		console.log("stripe webhook received");
		await wrapAsyncExpress(res, async () => {
			const sig = req.headers["stripe-signature"];
			if (!sig) {
				throw new ClientError("missing Stripe signature");
			}

			const secret = getStripeWebhookSecret();
			if (!secret) {
				throw new ClientError("missing Stripe webhook secret");
			}

			let event: stripe.Event;
			try {
				event = stripe.webhooks.constructEvent(req.rawBody, sig, secret);
			} catch (err) {
				console.log("webhook error", err);
				throw new ClientError(`webhook error ${err}`);
			}

			// https://docs.stripe.com/billing/subscriptions/webhooks#events
			console.log("event type", event.type);
			if (event.type === "customer.subscription.created") {
				await service.handleSubscriptionCreated(event);
			} else if (event.type === "customer.subscription.deleted") {
				await service.handleSubscriptionDeleted(event);
			}

			console.log("event successfully processed");
			res.json({ received: true });
		});
	},
);
