import { HandlerInput, HandlerOutput } from "@repo/functions";
import { Nullable } from "@repo/types";
import { AuthData } from "firebase-functions/tasks";
import { UnauthenticatedError } from "../utils/error.utils";
import { countWords } from "../utils/string.utils";
import {
  incrementWordCount,
  postProcessTranscription,
  transcribeAudioFromBase64,
  validateAudioInput,
  validateMemberWithinLimits
} from "../utils/voice.utils";

export const transcribe = async ({
  auth,
  input,
}: {
  auth: Nullable<AuthData>;
  input: HandlerInput<"voice/transcribe">;
}): Promise<HandlerOutput<"voice/transcribe">> => {
  if (!auth) {
    console.log("missing auth data");
    throw new UnauthenticatedError("You must be authenticated");
  }

  const { ext } = validateAudioInput({ audioMimeType: input.audioMimeType });
  await validateMemberWithinLimits({ auth });

  let transcript: string;
  if (input.simulate) {
    console.log("Simulating audio processing without actual AI generation");
    transcript = "Simulated response";
  } else {
    ({ audioTranscript: transcript } = await transcribeAudioFromBase64({
      audioBase64: input.audioBase64,
      audioExt: ext,
    }));
    transcript = await postProcessTranscription(transcript);
  }

  await incrementWordCount({
    auth,
    count: countWords(transcript),
  });

  return {
    text: transcript,
  };
};
