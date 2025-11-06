import {
  AI_MAX_AUDIO_DURATION_SECONDS,
  HandlerInput,
  HandlerOutput,
} from "@repo/functions";
import { Nullable } from "@repo/types";
import { countWords } from "@repo/utilities/src/string";
import { groqGenerateTextResponse, groqTranscribeAudio } from "@repo/voice-ai";
import { AuthData } from "firebase-functions/tasks";
import { getGroqApiKey } from "../utils/env.utils";
import { UnauthenticatedError } from "../utils/error.utils";
import {
  ensureAudioDurationWithinLimit,
  incrementTokenCount,
  incrementWordCount,
  validateAudioInput,
  validateMemberWithinLimits
} from "../utils/voice.utils";

export const runTranscribeAudio = async ({
  auth,
  input,
}: {
  auth: Nullable<AuthData>;
  input: HandlerInput<"ai/transcribeAudio">;
}): Promise<HandlerOutput<"ai/transcribeAudio">> => {
  if (!auth) {
    console.log("missing auth data");
    throw new UnauthenticatedError("You must be authenticated");
  }

  const { ext } = validateAudioInput({ audioMimeType: input.audioMimeType });
  await validateMemberWithinLimits({ auth });

  const blob = Buffer.from(input.audioBase64, "base64");
  const durationSeconds = ensureAudioDurationWithinLimit({
    audioBuffer: blob,
    maxDurationSeconds: AI_MAX_AUDIO_DURATION_SECONDS,
  });

  let transcript: string;
  let wordsUsed: number;
  if (input.simulate) {
    console.log("Simulating audio processing without actual AI generation");
    transcript = "Simulated response";
    wordsUsed = countWords(transcript);
  } else {
    const mb = blob.length / (1024 * 1024);
    console.log(
      "Processing",
      mb.toFixed(2),
      "MB of",
      ext,
      "audio lasting",
      durationSeconds.toFixed(2),
      "seconds"
    );
    ({ text: transcript, wordsUsed } = await groqTranscribeAudio({
      apiKey: getGroqApiKey(),
      blob,
      ext,
    }));
  }

  await incrementWordCount({
    auth,
    count: wordsUsed,
  });

  return {
    text: transcript,
  };
};

export const runGenerateText = async ({
  auth,
  input,
}: {
  auth: Nullable<AuthData>;
  input: HandlerInput<"ai/generateText">;
}): Promise<HandlerOutput<"ai/generateText">> => {
  if (!auth) {
    console.log("missing auth data");
    throw new UnauthenticatedError("You must be authenticated");
  }

  await validateMemberWithinLimits({ auth });

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
    auth,
    count: tokensUsed,
  });

  return {
    text: generatedText,
  };
}
