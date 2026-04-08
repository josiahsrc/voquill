export const buildDeepgramWebSocketUrl = (args: {
  sampleRate: number;
  language?: string;
}): string => {
  const params = new URLSearchParams({
    encoding: "linear16",
    sample_rate: String(args.sampleRate),
    model: "nova-3",
    punctuate: "true",
    smart_format: "true",
    interim_results: "true",
    endpointing: "300",
  });

  if (args.language && args.language !== "auto") {
    params.set("language", args.language);
  } else if (args.language === "auto") {
    params.set("detect_language", "true");
  }

  return `wss://api.deepgram.com/v1/listen?${params.toString()}`;
};
