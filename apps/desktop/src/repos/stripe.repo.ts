import { HandlerOutput, invokeHandler } from "@repo/functions";
import { BaseRepo } from "./base.repo";

export abstract class BaseStripeRepo extends BaseRepo {
  abstract createCheckoutSession(priceId: string): Promise<string>;
  abstract createCustomerPortalSession(): Promise<string>;
  abstract getPrices(
    priceIds: string[],
  ): Promise<HandlerOutput<"stripe/getPrices">>;
}

export class CloudStripeRepo extends BaseStripeRepo {
  async createCheckoutSession(priceId: string): Promise<string> {
    const res = await invokeHandler("stripe/createCheckoutSession", {
      priceId,
    });
    return res.clientSecret;
  }

  async createCustomerPortalSession(): Promise<string> {
    const res = await invokeHandler("stripe/createCustomerPortalSession", {});
    return res.url;
  }

  async getPrices(
    priceIds: string[],
  ): Promise<HandlerOutput<"stripe/getPrices">> {
    return invokeHandler("stripe/getPrices", { priceIds });
  }
}
