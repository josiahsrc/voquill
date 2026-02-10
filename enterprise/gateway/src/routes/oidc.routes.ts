import { Router, type Request, type Response } from "express";
import { getOidcProviderRowById } from "../repo/oidc-provider.repo";
import { findOrCreateOidcUser } from "../services/oidc-auth.service";
import { signAuthToken, signRefreshToken } from "../utils/auth.utils";
import { decryptApiKey } from "../utils/crypto.utils";
import { getEncryptionSecret } from "../utils/env.utils";
import {
  discoverOidcEndpoints,
  exchangeCodeForTokens,
  validateIdToken,
} from "../utils/oidc.utils";
import { createOidcState, consumeOidcState } from "../utils/oidc-state.utils";

const router = Router();

router.get("/auth/oidc/authorize", async (req: Request, res: Response) => {
  try {
    const providerId = req.query.provider_id as string;
    const localPort = parseInt(req.query.local_port as string, 10);
    const clientState = (req.query.state as string) || "";

    if (!providerId || !localPort) {
      res.status(400).send("Missing provider_id or local_port");
      return;
    }

    const providerRow = await getOidcProviderRowById(providerId);
    if (!providerRow || !providerRow.is_enabled) {
      res.status(404).send("OIDC provider not found or disabled");
      return;
    }

    const discovery = await discoverOidcEndpoints(providerRow.issuer_url);
    const serverState = createOidcState(localPort, providerId, clientState);

    const gatewayOrigin = `${req.protocol}://${req.get("host")}`;
    const redirectUri = `${gatewayOrigin}/auth/oidc/callback`;

    const params = new URLSearchParams({
      response_type: "code",
      client_id: providerRow.client_id,
      redirect_uri: redirectUri,
      scope: "openid email profile",
      state: serverState,
    });

    res.redirect(`${discovery.authorization_endpoint}?${params.toString()}`);
  } catch (error) {
    console.error("OIDC authorize error:", error);
    res.status(500).send("Failed to initiate OIDC flow");
  }
});

router.get("/auth/oidc/callback", async (req: Request, res: Response) => {
  try {
    const code = req.query.code as string;
    const serverState = req.query.state as string;

    if (!code || !serverState) {
      res.status(400).send("Missing code or state");
      return;
    }

    const stateData = consumeOidcState(serverState);
    if (!stateData) {
      res.status(400).send("Invalid or expired state");
      return;
    }

    const { localPort, providerId, clientState } = stateData;

    const providerRow = await getOidcProviderRowById(providerId);
    if (!providerRow) {
      res.status(404).send("OIDC provider not found");
      return;
    }

    const clientSecret = decryptApiKey(
      providerRow.client_secret_encrypted,
      getEncryptionSecret(),
    );

    const discovery = await discoverOidcEndpoints(providerRow.issuer_url);

    const gatewayOrigin = `${req.protocol}://${req.get("host")}`;
    const redirectUri = `${gatewayOrigin}/auth/oidc/callback`;

    const tokens = await exchangeCodeForTokens(
      discovery.token_endpoint,
      code,
      redirectUri,
      providerRow.client_id,
      clientSecret,
    );

    const claims = await validateIdToken(
      discovery.jwks_uri,
      tokens.idToken,
      discovery.issuer,
      providerRow.client_id,
    );

    const auth = await findOrCreateOidcUser(
      claims.sub,
      claims.email ?? "",
      claims.name ?? "",
      providerId,
    );

    const token = signAuthToken(auth);
    const refreshToken = signRefreshToken(auth);

    const callbackParams = new URLSearchParams({
      token,
      refreshToken,
      state: clientState,
      authId: auth.id,
      email: auth.email,
    });

    res.redirect(
      `http://127.0.0.1:${localPort}/callback?${callbackParams.toString()}`,
    );
  } catch (error) {
    console.error("OIDC callback error:", error);
    res.status(500).send("OIDC authentication failed");
  }
});

export default router;
