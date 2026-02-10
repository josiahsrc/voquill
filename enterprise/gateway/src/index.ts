import {
  AiGenerateTextInputZod,
  AiTranscribeAudioInputZod,
  AuthDeleteUserInputZod,
  AuthLoginInputZod,
  AuthMakeAdminInputZod,
  AuthRefreshInputZod,
  AuthRegisterInputZod,
  AuthResetPasswordInputZod,
  DeleteLlmProviderInputZod,
  DeleteOidcProviderInputZod,
  DeleteSttProviderInputZod,
  DeleteTermInputZod,
  DeleteToneInputZod,
  EmptyObjectZod,
  PullLlmProviderInputZod,
  PullSttProviderInputZod,
  SetMyUserInputZod,
  UpsertEnterpriseConfigInputZod,
  UpsertLlmProviderInputZod,
  UpsertOidcProviderInputZod,
  UpsertSttProviderInputZod,
  UpsertTermInputZod,
  UpsertToneInputZod,
  type HandlerName,
} from "@repo/functions";
import cors from "cors";
import type { Request, Response } from "express";
import express from "express";
import { runMigrations } from "./db/migrate";
import { generateText, transcribeAudio } from "./services/ai.service";
import {
  deleteUser,
  login,
  logout,
  makeAdmin,
  refresh,
  register,
  resetPassword,
} from "./services/auth.service";
import { getFullConfig } from "./services/config.service";
import {
  getEnterpriseConfigHandler,
  upsertEnterpriseConfigHandler,
} from "./services/enterprise-config.service";
import {
  deleteLlmProviderHandler,
  listLlmProvidersHandler,
  pullLlmProviderHandler,
  upsertLlmProviderHandler,
} from "./services/llm-provider.service";
import { getMyMember, tryInitialize } from "./services/member.service";
import {
  deleteOidcProviderHandler,
  listEnabledOidcProvidersHandler,
  listOidcProvidersHandler,
  upsertOidcProviderHandler,
} from "./services/oidc-provider.service";
import {
  deleteSttProviderHandler,
  listSttProvidersHandler,
  pullSttProviderHandler,
  upsertSttProviderHandler,
} from "./services/stt-provider.service";
import {
  deleteGlobalTermHandler,
  deleteMyTerm,
  listGlobalTermsHandler,
  listMyTerms,
  upsertGlobalTermHandler,
  upsertMyTerm,
} from "./services/term.service";
import {
  deleteGlobalToneHandler,
  deleteMyTone,
  listGlobalTonesHandler,
  listMyTones,
  upsertGlobalToneHandler,
  upsertMyTone,
} from "./services/tone.service";
import {
  getMyUser,
  listAllUsersHandler,
  setMyUser,
} from "./services/user.service";
import oidcRoutes from "./routes/oidc.routes";
import { extractAuth } from "./utils/auth.utils";
import { getGatewayVersion } from "./utils/env.utils";
import {
  ClientError,
  ConflictError,
  NotFoundError,
  UnauthorizedError,
} from "./utils/error.utils";
import { validateData, validateLicense } from "./utils/validation.utils";

const app = express();
app.set("trust proxy", true);
app.use(cors());
app.use(express.json({ limit: "50mb" }));
app.use(oidcRoutes);

type HandlerRequest = {
  name: HandlerName;
  input: unknown;
};

app.post("/handler", async (req: Request, res: Response) => {
  try {
    validateLicense(new Date());

    const { name, input } = req.body as HandlerRequest;
    const auth = extractAuth(req.headers.authorization);

    let data: unknown;
    if (name === "auth/register") {
      data = await register(validateData(AuthRegisterInputZod, input));
    } else if (name === "auth/login") {
      data = await login(validateData(AuthLoginInputZod, input));
    } else if (name === "auth/logout") {
      validateData(EmptyObjectZod, input);
      data = await logout();
    } else if (name === "auth/refresh") {
      data = await refresh({ input: validateData(AuthRefreshInputZod, input) });
    } else if (name === "auth/makeAdmin") {
      data = await makeAdmin({
        auth,
        input: validateData(AuthMakeAdminInputZod, input),
      });
    } else if (name === "auth/deleteUser") {
      data = await deleteUser({
        auth,
        input: validateData(AuthDeleteUserInputZod, input),
      });
    } else if (name === "auth/resetPassword") {
      data = await resetPassword({
        auth,
        input: validateData(AuthResetPasswordInputZod, input),
      });
    } else if (name === "user/setMyUser") {
      data = await setMyUser({
        auth,
        input: validateData(SetMyUserInputZod, input),
      });
    } else if (name === "user/getMyUser") {
      validateData(EmptyObjectZod, input);
      data = await getMyUser({ auth });
    } else if (name === "user/listAllUsers") {
      validateData(EmptyObjectZod, input);
      data = await listAllUsersHandler({ auth });
    } else if (name === "member/tryInitialize") {
      validateData(EmptyObjectZod, input);
      data = await tryInitialize({ auth });
    } else if (name === "member/getMyMember") {
      validateData(EmptyObjectZod, input);
      data = await getMyMember({ auth });
    } else if (name === "term/listMyTerms") {
      validateData(EmptyObjectZod, input);
      data = await listMyTerms({ auth });
    } else if (name === "term/upsertMyTerm") {
      data = await upsertMyTerm({
        auth,
        input: validateData(UpsertTermInputZod, input),
      });
    } else if (name === "term/deleteMyTerm") {
      data = await deleteMyTerm({
        auth,
        input: validateData(DeleteTermInputZod, input),
      });
    } else if (name === "term/listGlobalTerms") {
      validateData(EmptyObjectZod, input);
      data = await listGlobalTermsHandler({ auth });
    } else if (name === "term/upsertGlobalTerm") {
      data = await upsertGlobalTermHandler({
        auth,
        input: validateData(UpsertTermInputZod, input),
      });
    } else if (name === "term/deleteGlobalTerm") {
      data = await deleteGlobalTermHandler({
        auth,
        input: validateData(DeleteTermInputZod, input),
      });
    } else if (name === "tone/listMyTones") {
      validateData(EmptyObjectZod, input);
      data = await listMyTones({ auth });
    } else if (name === "tone/upsertMyTone") {
      data = await upsertMyTone({
        auth,
        input: validateData(UpsertToneInputZod, input),
      });
    } else if (name === "tone/deleteMyTone") {
      data = await deleteMyTone({
        auth,
        input: validateData(DeleteToneInputZod, input),
      });
    } else if (name === "tone/listGlobalTones") {
      validateData(EmptyObjectZod, input);
      data = await listGlobalTonesHandler({ auth });
    } else if (name === "tone/upsertGlobalTone") {
      data = await upsertGlobalToneHandler({
        auth,
        input: validateData(UpsertToneInputZod, input),
      });
    } else if (name === "tone/deleteGlobalTone") {
      data = await deleteGlobalToneHandler({
        auth,
        input: validateData(DeleteToneInputZod, input),
      });
    } else if (name === "sttProvider/list") {
      validateData(EmptyObjectZod, input);
      data = await listSttProvidersHandler({ auth });
    } else if (name === "sttProvider/upsert") {
      data = await upsertSttProviderHandler({
        auth,
        input: validateData(UpsertSttProviderInputZod, input),
      });
    } else if (name === "sttProvider/delete") {
      data = await deleteSttProviderHandler({
        auth,
        input: validateData(DeleteSttProviderInputZod, input),
      });
    } else if (name === "sttProvider/pull") {
      data = await pullSttProviderHandler({
        auth,
        input: validateData(PullSttProviderInputZod, input),
      });
    } else if (name === "llmProvider/list") {
      validateData(EmptyObjectZod, input);
      data = await listLlmProvidersHandler({ auth });
    } else if (name === "llmProvider/upsert") {
      data = await upsertLlmProviderHandler({
        auth,
        input: validateData(UpsertLlmProviderInputZod, input),
      });
    } else if (name === "llmProvider/delete") {
      data = await deleteLlmProviderHandler({
        auth,
        input: validateData(DeleteLlmProviderInputZod, input),
      });
    } else if (name === "llmProvider/pull") {
      data = await pullLlmProviderHandler({
        auth,
        input: validateData(PullLlmProviderInputZod, input),
      });
    } else if (name === "ai/generateText") {
      data = await generateText({
        auth,
        input: validateData(AiGenerateTextInputZod, input),
      });
    } else if (name === "ai/transcribeAudio") {
      data = await transcribeAudio({
        auth,
        input: validateData(AiTranscribeAudioInputZod, input),
      });
    } else if (name === "system/getVersion") {
      validateData(EmptyObjectZod, input);
      data = { version: getGatewayVersion() };
    } else if (name === "enterprise/getConfig") {
      validateData(EmptyObjectZod, input);
      data = await getEnterpriseConfigHandler();
    } else if (name === "enterprise/upsertConfig") {
      data = await upsertEnterpriseConfigHandler({
        auth,
        input: validateData(UpsertEnterpriseConfigInputZod, input),
      });
    } else if (name === "oidcProvider/list") {
      validateData(EmptyObjectZod, input);
      data = await listOidcProvidersHandler({ auth });
    } else if (name === "oidcProvider/upsert") {
      data = await upsertOidcProviderHandler({
        auth,
        input: validateData(UpsertOidcProviderInputZod, input),
      });
    } else if (name === "oidcProvider/delete") {
      data = await deleteOidcProviderHandler({
        auth,
        input: validateData(DeleteOidcProviderInputZod, input),
      });
    } else if (name === "oidcProvider/listEnabled") {
      validateData(EmptyObjectZod, input);
      data = await listEnabledOidcProvidersHandler();
    } else if (name === "config/getFullConfig") {
      validateData(EmptyObjectZod, input);
      data = await getFullConfig();
    } else {
      throw new NotFoundError(`Unknown handler: ${name}`);
    }

    res.json({ success: true, data });
  } catch (error) {
    if (error instanceof NotFoundError) {
      res.status(404).json({ success: false, error: error.message });
    } else if (error instanceof UnauthorizedError) {
      res.status(401).json({ success: false, error: error.message });
    } else if (error instanceof ConflictError) {
      res.status(409).json({ success: false, error: error.message });
    } else if (error instanceof ClientError) {
      res.status(400).json({ success: false, error: error.message });
    } else {
      console.error("Unexpected error:", error);
      res.status(500).json({ success: false, error: "Internal server error" });
    }
  }
});

app.get("/health", (_req: Request, res: Response) => {
  res.json({ status: "ok" });
});

const PORT = process.env.PORT || 4630;

async function main() {
  await runMigrations();
  app.listen(PORT, () => {
    console.log(`Gateway server listening on port ${PORT}`);
  });
}

main().catch((error) => {
  console.error("Failed to start server:", error);
  process.exit(1);
});
