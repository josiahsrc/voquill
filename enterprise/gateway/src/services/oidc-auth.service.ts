import type { Auth } from "@repo/types";
import {
  countAll,
  createAuth,
  findAuthByEmail,
  findAuthByOidcSub,
  linkOidcSub,
} from "../repo/auth.repo";
import { ClientError } from "../utils/error.utils";
import { getLicenseKey } from "../utils/license-key.utils";

export async function findOrCreateOidcUser(
  oidcSub: string,
  email: string,
  _name: string,
  oidcProviderId: string,
): Promise<Auth> {
  const existingBySub = await findAuthByOidcSub(oidcSub);
  if (existingBySub) {
    return {
      id: existingBySub.id,
      email: existingBySub.email,
      isAdmin: existingBySub.is_admin,
      createdAt: existingBySub.created_at.toISOString(),
    };
  }

  if (email) {
    const existingByEmail = await findAuthByEmail(email);
    if (existingByEmail) {
      await linkOidcSub(existingByEmail.id, oidcSub, oidcProviderId);
      return {
        id: existingByEmail.id,
        email: existingByEmail.email,
        isAdmin: existingByEmail.is_admin,
        createdAt: existingByEmail.created_at.toISOString(),
      };
    }
  }

  const { max_seats } = getLicenseKey();
  const currentUserCount = await countAll();
  if (currentUserCount >= max_seats) {
    throw new ClientError(
      "Your organization has reached its maximum number of seats. Please ask your administrator to request more seats.",
    );
  }

  return await createOidcAuth(email, oidcSub, oidcProviderId);
}

async function createOidcAuth(
  email: string,
  oidcSub: string,
  oidcProviderId: string,
): Promise<Auth> {
  return await createAuth(email, null, {
    oidcSub,
    oidcProviderId,
    authProvider: "oidc",
  });
}
