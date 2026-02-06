import * as jose from "jose";

type OidcDiscovery = {
  authorization_endpoint: string;
  token_endpoint: string;
  jwks_uri: string;
  issuer: string;
};

const discoveryCache = new Map<string, { data: OidcDiscovery; expiresAt: number }>();
const CACHE_TTL_MS = 10 * 60 * 1000;

function rewriteUrlForInternal(url: string): string {
  const rewrites = process.env.OIDC_URL_REWRITES;
  if (!rewrites) return url;

  for (const rule of rewrites.split(",")) {
    const [from, to] = rule.split("->");
    if (from && to && url.includes(from)) {
      return url.replace(from, to);
    }
  }
  return url;
}

export async function discoverOidcEndpoints(
  issuerUrl: string,
): Promise<OidcDiscovery> {
  const now = Date.now();
  const cached = discoveryCache.get(issuerUrl);
  if (cached && cached.expiresAt > now) {
    return cached.data;
  }

  const internalIssuerUrl = rewriteUrlForInternal(issuerUrl);
  const url = internalIssuerUrl.replace(/\/+$/, "") + "/.well-known/openid-configuration";
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(
      `Failed to fetch OIDC discovery from ${url}: ${res.status} ${res.statusText}`,
    );
  }

  const rawData = (await res.json()) as OidcDiscovery;
  const data: OidcDiscovery = {
    authorization_endpoint: rawData.authorization_endpoint,
    token_endpoint: rewriteUrlForInternal(rawData.token_endpoint),
    jwks_uri: rewriteUrlForInternal(rawData.jwks_uri),
    issuer: rawData.issuer,
  };
  discoveryCache.set(issuerUrl, { data, expiresAt: now + CACHE_TTL_MS });
  return data;
}

export async function exchangeCodeForTokens(
  tokenEndpoint: string,
  code: string,
  redirectUri: string,
  clientId: string,
  clientSecret: string,
): Promise<{ idToken: string; accessToken: string }> {
  const res = await fetch(tokenEndpoint, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: redirectUri,
      client_id: clientId,
      client_secret: clientSecret,
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Token exchange failed: ${res.status} ${text}`);
  }

  const data = (await res.json()) as {
    id_token: string;
    access_token: string;
  };

  return { idToken: data.id_token, accessToken: data.access_token };
}

export type OidcIdTokenClaims = {
  sub: string;
  email?: string;
  name?: string;
};

export async function validateIdToken(
  jwksUri: string,
  idToken: string,
  expectedIssuer: string,
  expectedAudience: string,
): Promise<OidcIdTokenClaims> {
  const jwks = jose.createRemoteJWKSet(new URL(jwksUri));
  const { payload } = await jose.jwtVerify(idToken, jwks, {
    issuer: expectedIssuer,
    audience: expectedAudience,
  });

  if (!payload.sub) {
    throw new Error("ID token missing sub claim");
  }

  return {
    sub: payload.sub,
    email: payload.email as string | undefined,
    name: payload.name as string | undefined,
  };
}
