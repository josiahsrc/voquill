import * as sdk from "microsoft-cognitiveservices-speech-sdk";

export type AzureTranscriptionArgs = {
  subscriptionKey: string;
  region: string;
  blob: ArrayBuffer | Buffer;
  language?: string;
  prompt?: string;
};

export type AzureTranscribeAudioOutput = {
  text: string;
};

export const azureTranscribeAudio = async ({
  subscriptionKey,
  region,
  blob,
  language = "en-US",
  prompt,
}: AzureTranscriptionArgs): Promise<AzureTranscribeAudioOutput> => {
  return new Promise((resolve, reject) => {
    const speechConfig = sdk.SpeechConfig.fromSubscription(
      subscriptionKey.trim(),
      region.trim()
    );
    speechConfig.speechRecognitionLanguage = language;

    const audioBuffer = blob instanceof ArrayBuffer ? blob : blob.buffer as ArrayBuffer;

    const pushStream = sdk.AudioInputStream.createPushStream();
    pushStream.write(audioBuffer);
    pushStream.close();

    const audioConfig = sdk.AudioConfig.fromStreamInput(pushStream);
    const recognizer = new sdk.SpeechRecognizer(speechConfig, audioConfig);

    if (prompt) {
      const phraseListGrammar = sdk.PhraseListGrammar.fromRecognizer(recognizer);
      const phrases = prompt.split(/[\s,]+/).filter(p => p.length > 0);
      phrases.forEach(phrase => phraseListGrammar.addPhrase(phrase));
    }

    recognizer.recognizeOnceAsync(
      (result) => {
        recognizer.close();

        if (result.reason === sdk.ResultReason.RecognizedSpeech) {
          resolve({ text: result.text });
        } else if (result.reason === sdk.ResultReason.NoMatch) {
          resolve({ text: "" });
        } else {
          reject(new Error(`Azure recognition failed: ${result.errorDetails}`));
        }
      },
      (error) => {
        recognizer.close();
        reject(new Error(`Azure API request failed: ${error}`));
      }
    );
  });
};

export type AzureTestIntegrationArgs = {
  subscriptionKey: string;
  region: string;
};

export const azureTestIntegration = async ({
  subscriptionKey,
  region,
}: AzureTestIntegrationArgs): Promise<boolean> => {
  try {
    const silentBuffer = new ArrayBuffer(0);
    await azureTranscribeAudio({
      subscriptionKey,
      region,
      blob: silentBuffer,
    });
    return true;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "";
    return !errorMessage.includes("authentication") && !errorMessage.includes("subscription");
  }
};
