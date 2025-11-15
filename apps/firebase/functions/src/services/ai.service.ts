import {
  HandlerInput,
  HandlerOutput
} from "@repo/functions";
import { Nullable } from "@repo/types";
import { countWords } from "@repo/utilities/src/string";
import { groqGenerateTextResponse, groqTranscribeAudio } from "@repo/voice-ai";
import { AuthData } from "firebase-functions/tasks";
import { checkPaidAccess } from "../utils/check.utils";
import { getGroqApiKey } from "../utils/env.utils";
import { ClientError } from "../utils/error.utils";
import {
  incrementTokenCount,
  incrementWordCount,
  validateAudioInput,
  validateMemberWithinLimits
} from "../utils/voice.utils";

const MAX_BLOB_BYTES = 16 * 1024 * 1024; // 16 MB

export const runTranscribeAudio = async ({
  auth,
  input,
}: {
  auth: Nullable<AuthData>;
  input: HandlerInput<"ai/transcribeAudio">;
}): Promise<HandlerOutput<"ai/transcribeAudio">> => {
  const blob = Buffer.from(input.audioBase64, "base64");
  const blobBytes = blob.length;
  if (blobBytes === 0) {
    throw new ClientError("Audio data is empty");
  }

  if (blobBytes > MAX_BLOB_BYTES) {
    throw new ClientError("Audio data exceeds maximum size of 16 MB");
  }

  const access = await checkPaidAccess(auth);
  const { ext } = validateAudioInput({ audioMimeType: input.audioMimeType });
  await validateMemberWithinLimits({ auth: access.auth });

  let transcript: string;
  let wordsUsed: number;
  if (input.simulate) {
    console.log("Simulating audio processing without actual AI generation");
    transcript = "Simulated response";
    wordsUsed = countWords(transcript);
  } else {
    const mb = blob.length / (1024 * 1024);
    console.log("Processing", mb.toFixed(2), "MB of", ext);
    ({ text: transcript, wordsUsed } = await groqTranscribeAudio({
      apiKey: getGroqApiKey(),
      blob,
      ext,
      language: input.language,
    }));
  }

  await incrementWordCount({
    auth: access.auth,
    count: wordsUsed,
  });

  return {
    text: transcript,
  };
}

export const runGenerateText = async ({
  auth,
  input,
}: {
  auth: Nullable<AuthData>;
  input: HandlerInput<"ai/generateText">;
}): Promise<HandlerOutput<"ai/generateText">> => {
  const access = await checkPaidAccess(auth);
  await validateMemberWithinLimits({ auth: access.auth });

  let generatedText: string;
  let tokensUsed: number;
  if (input.simulate) {
    console.log("Simulating text generation without actual AI generation");
    generatedText = "Simulated generated text.";
    tokensUsed = countWords(generatedText);
  } else {
    ({ text: generatedText, tokensUsed } = await groqGenerateTextResponse({
      apiKey: getGroqApiKey(),
      prompt: input.prompt,
      system: input.system ?? undefined,
      jsonResponse: input.jsonResponse ?? undefined,
    }));
  }

  await incrementTokenCount({
    auth: access.auth,
    count: tokensUsed,
  });

  return {
    text: generatedText,
  };
}
