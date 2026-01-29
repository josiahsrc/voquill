import {
  AiGenerateTextInputZod,
  AiTranscribeAudioInputZod,
  AuthLoginInputZod,
  AuthMakeAdminInputZod,
  AuthRegisterInputZod,
  DeleteTermInputZod,
  EmptyObjectZod,
  SetMyUserInputZod,
  UpsertTermInputZod,
  type HandlerName,
} from "@repo/functions";
import type { Request, Response } from "express";
import express from "express";
import cors from "cors";
import { runMigrations } from "./db/migrate";
import { login, logout, makeAdmin, refresh, register } from "./services/auth.service";
import { generateText, transcribeAudio } from "./services/ai.service";
import { getFullConfig } from "./services/config.service";
import { getMyMember, tryInitialize } from "./services/member.service";
import { listMyTerms, upsertMyTerm, deleteMyTerm, listGlobalTermsHandler, upsertGlobalTermHandler, deleteGlobalTermHandler } from "./services/term.service";
import { getMyUser, setMyUser, listAllUsersHandler } from "./services/user.service";
import { extractAuth } from "./utils/auth.utils";
import {
  ClientError,
  ConflictError,
  NotFoundError,
  UnauthorizedError,
} from "./utils/error.utils";
import { validateData } from "./utils/validation.utils";

const app = express();
app.use(cors());
app.use(express.json({ limit: "50mb" }));

type HandlerRequest = {
  name: HandlerName;
  input: unknown;
};

app.post("/handler", async (req: Request, res: Response) => {
  try {
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
      validateData(EmptyObjectZod, input);
      data = await refresh({ auth });
    } else if (name === "auth/makeAdmin") {
      data = await makeAdmin({
        auth,
        input: validateData(AuthMakeAdminInputZod, input),
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

const PORT = process.env.PORT || 3000;

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
