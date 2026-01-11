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

const AZURE_LOCALE_REGEX = /^[a-z]{2,3}-[A-Z]{2}$/;

const mapToAzureLocale = (language?: string): string => {
  if (!language || language.trim() === "") {
    return "en-US";
  }

  const trimmedLanguage = language.trim();

  if (trimmedLanguage.includes("-")) {
    if (AZURE_LOCALE_REGEX.test(trimmedLanguage)) {
      return trimmedLanguage;
    }
    const baseLang = trimmedLanguage.split("-")[0];
    if (baseLang) {
      return mapToAzureLocale(baseLang);
    }
  }

  const languageMap: Record<string, string> = {
    en: "en-US",
    es: "es-ES",
    fr: "fr-FR",
    de: "de-DE",
    it: "it-IT",
    pt: "pt-PT",
    ru: "ru-RU",
    ja: "ja-JP",
    ko: "ko-KR",
    zh: "zh-CN",
    ar: "ar-SA",
    nl: "nl-NL",
    sv: "sv-SE",
    tr: "tr-TR",
    pl: "pl-PL",
    ca: "ca-ES",
    id: "id-ID",
    hi: "hi-IN",
    fi: "fi-FI",
    vi: "vi-VN",
    he: "he-IL",
    uk: "uk-UA",
    el: "el-GR",
    ms: "ms-MY",
    cs: "cs-CZ",
    ro: "ro-RO",
    da: "da-DK",
    hu: "hu-HU",
    ta: "ta-IN",
    no: "nb-NO",
    th: "th-TH",
    ur: "ur-PK",
    hr: "hr-HR",
    bg: "bg-BG",
    lt: "lt-LT",
    sk: "sk-SK",
    sl: "sl-SI",
    et: "et-EE",
    lv: "lv-LV",
    fa: "fa-IR",
    sr: "sr-RS",
    bn: "bn-IN",
    af: "af-ZA",
    hy: "hy-AM",
    az: "az-AZ",
    eu: "eu-ES",
    bs: "bs-BA",
    gl: "gl-ES",
    gu: "gu-IN",
    is: "is-IS",
    kk: "kk-KZ",
    kn: "kn-IN",
    km: "km-KH",
    lo: "lo-LA",
    mk: "mk-MK",
    ml: "ml-IN",
    mr: "mr-IN",
    mn: "mn-MN",
    ne: "ne-NP",
    ps: "ps-AF",
    si: "si-LK",
    sw: "sw-KE",
    te: "te-IN",
    uz: "uz-UZ",
    cy: "cy-GB",
    am: "am-ET",
    ka: "ka-GE",
    my: "my-MM",
    so: "so-SO",
    sq: "sq-AL",
  };

  return languageMap[trimmedLanguage] || "en-US";
};

export const azureTranscribeAudio = async ({
  subscriptionKey,
  region,
  blob,
  language = "en-US",
  prompt,
}: AzureTranscriptionArgs): Promise<AzureTranscribeAudioOutput> => {
  return new Promise((resolve, reject) => {
    const azureLocale = mapToAzureLocale(language);
    const trimmedRegion = region.trim();
    const trimmedKey = subscriptionKey.trim();

    const speechConfig = sdk.SpeechConfig.fromSubscription(
      trimmedKey,
      trimmedRegion
    );
    speechConfig.speechRecognitionLanguage = azureLocale;

    const audioBuffer = blob instanceof ArrayBuffer ? blob : blob.buffer as ArrayBuffer;

    const dataView = new DataView(audioBuffer);
    const sampleRate = dataView.getUint32(24, true);
    const bitsPerSample = dataView.getUint16(34, true);
    const channels = dataView.getUint16(22, true);

    const audioFormat = sdk.AudioStreamFormat.getWaveFormatPCM(sampleRate, bitsPerSample, channels);
    const pushStream = sdk.AudioInputStream.createPushStream(audioFormat);

    const uint8Array = new Uint8Array(audioBuffer);
    const wavHeaderSize = 44;
    const audioData = uint8Array.slice(wavHeaderSize);

    pushStream.write(audioData.buffer);
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
