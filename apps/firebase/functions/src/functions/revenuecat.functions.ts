import { onRequest } from "firebase-functions/v2/https";
import {
	handleExpiration,
	handleInitialPurchase,
} from "../services/revenuecat.service";
import {
	getRevenueCatWebhookSecret,
	REVENUECAT_WEBHOOK_SECRET_VAR,
} from "../utils/env.utils";
import { ClientError, wrapAsyncExpress } from "../utils/error.utils";

export const webhook = onRequest(
	{ secrets: [REVENUECAT_WEBHOOK_SECRET_VAR] },
	async (req, res) => {
		console.log("revenuecat webhook received");
		await wrapAsyncExpress(res, async () => {
			const authHeader = req.headers["authorization"];
			const secret = getRevenueCatWebhookSecret();
			if (!authHeader || authHeader !== `Bearer ${secret}`) {
				throw new ClientError("unauthorized");
			}

			const body = req.body as {
				api_version?: string;
				event?: { type?: string; app_user_id?: string };
			};
			const event = body?.event;
			if (!event?.type || !event?.app_user_id) {
				throw new ClientError("invalid webhook payload");
			}

			console.log("revenuecat event type", event.type);
			switch (event.type) {
				case "INITIAL_PURCHASE":
				case "RENEWAL":
				case "UNCANCELLATION":
					await handleInitialPurchase(event as { type: string; app_user_id: string });
					break;
				case "CANCELLATION":
				case "EXPIRATION":
					await handleExpiration(event as { type: string; app_user_id: string });
					break;
				case "TEST":
					console.log("received RevenueCat test event");
					break;
				default:
					console.log("unhandled RevenueCat event type", event.type);
					break;
			}

			res.json({ received: true });
		});
	},
);
