import { AuthData } from "firebase-functions/tasks";
import { HandlerInput, HandlerOutput } from "@repo/functions";
import { UnauthenticatedError } from "../utils/error.utils";
import { resizeBase64Image } from "../utils/image.utils";
import { countWords } from "../utils/string.utils";
import {
  cleanTranscription,
  fulfillTranscriptionIntent,
  incrementWordCount,
  transcribeAudioFromBase64,
  validateAudioInput,
  validateMemberWithinLimits,
} from "../utils/voice.utils";
import {
  incrementDemoUsage,
  validateDemoUsageWithinLimits,
} from "../utils/demo.util";
import { Nullable } from "@repo/types";
import { firemix } from "@firemix/mixed";
import { mixpath } from "@repo/firemix";

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
    transcript = await cleanTranscription(transcript);
  }

  await incrementWordCount({
    auth,
    count: countWords(transcript),
  });

  return {
    text: transcript,
  };
};

export const transcribeDemo = async ({
  ip,
  input,
}: {
  input: HandlerInput<"voice/transcribeDemo">;
  ip: string;
}): Promise<HandlerOutput<"voice/transcribeDemo">> => {
  await validateDemoUsageWithinLimits({
    ip,
    browserId: input.clientId,
  });

  const { ext } = validateAudioInput({ audioMimeType: input.audioMimeType });

  let transcript: string;
  let seconds: number;
  if (input.simulate) {
    console.log("Simulating audio processing without actual AI generation");
    transcript = "Simulated response";
    seconds = 5;
  } else {
    ({ audioTranscript: transcript, durationSeconds: seconds } =
      await transcribeAudioFromBase64({
        audioBase64: input.audioBase64,
        audioExt: ext,
      }));
    transcript = await cleanTranscription(transcript);
  }

  await incrementDemoUsage({
    ip,
    browserId: input.clientId,
    words: countWords(transcript),
    seconds,
  });

  return {
    text: transcript,
  };
};

export const compose = async ({
  auth,
  input,
}: {
  auth: Nullable<AuthData>;
  input: HandlerInput<"voice/compose">;
}): Promise<HandlerOutput<"voice/compose">> => {
  if (!auth) {
    console.log("missing auth data");
    throw new UnauthenticatedError("You must be authenticated");
  }

  const { ext } = validateAudioInput({ audioMimeType: input.audioMimeType });
  await validateMemberWithinLimits({ auth });
  const user = await firemix().get(mixpath.users(auth.uid));

  let transcript: string;
  if (input.simulate) {
    console.log("Simulating audio processing without actual AI generation");
    transcript = "Simulated response";
  } else {
    let screenshot: string | undefined = undefined;
    if (input.pageScreenshotBase64) {
      screenshot = await resizeBase64Image({
        imageBase64: input.pageScreenshotBase64,
        maxWidth: 512,
        maxHeight: 512,
      });
    }

    ({ audioTranscript: transcript } = await transcribeAudioFromBase64({
      audioBase64: input.audioBase64,
      audioExt: ext,
    }));

    transcript = await fulfillTranscriptionIntent({
      input: transcript,
      pageScreenshotBase64: screenshot,
      inputFieldContext: input.inputFieldContext ?? undefined,
      currentInputTextValue: input.currentInputTextValue ?? undefined,
      currentInputTextSelection: input.currentInputTextSelection ?? undefined,
      user: user?.data,
    });
  }

  await incrementWordCount({
    auth,
    count: countWords(transcript),
  });

  return {
    text: transcript,
  };
};

export const composeDemo = async ({
  ip,
  input,
}: {
  input: HandlerInput<"voice/composeDemo">;
  ip: string;
}): Promise<HandlerOutput<"voice/composeDemo">> => {
  await validateDemoUsageWithinLimits({
    ip,
    browserId: input.clientId,
  });

  const { ext } = validateAudioInput({ audioMimeType: input.audioMimeType });

  let transcript: string;
  let seconds: number;
  if (input.simulate) {
    console.log("Simulating audio processing without actual AI generation");
    transcript = "Simulated response";
    seconds = 5;
  } else {
    ({ audioTranscript: transcript, durationSeconds: seconds } =
      await transcribeAudioFromBase64({
        audioBase64: input.audioBase64,
        audioExt: ext,
      }));

    transcript = await fulfillTranscriptionIntent({
      input: transcript,
      currentInputTextValue: input.currentInputTextValue ?? undefined,
      currentInputTextSelection: input.currentInputTextSelection ?? undefined,
    });
  }
  await incrementDemoUsage({
    ip,
    browserId: input.clientId,
    words: countWords(transcript),
    seconds,
  });
  return {
    text: transcript,
  };
};

export const demoAvailable = async (args: {
  input: HandlerInput<"voice/demoAvailable">;
  ip: string;
}): Promise<HandlerOutput<"voice/demoAvailable">> => {
  try {
    await validateDemoUsageWithinLimits({
      ip: args.ip,
      browserId: args.input.clientId,
    });
    return { available: true };
  } catch {
    return { available: false };
  }
};
