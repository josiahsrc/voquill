export type ElevenLabsTestIntegrationArgs = {
  apiKey: string;
};

export const elevenlabsTestIntegration = async ({
  apiKey,
}: ElevenLabsTestIntegrationArgs): Promise<boolean> => {
  try {
    const response = await fetch("https://api.elevenlabs.io/v1/user", {
      method: "GET",
      headers: { "xi-api-key": apiKey },
    });
    return response.ok;
  } catch {
    return false;
  }
};

export const convertFloat32ToBase64PCM16 = (
  float32Array: Float32Array | number[],
): string => {
  const samples = Array.isArray(float32Array)
    ? float32Array
    : Array.from(float32Array);
  const buffer = new ArrayBuffer(samples.length * 2);
  const view = new DataView(buffer);

  for (let i = 0; i < samples.length; i++) {
    const s = Math.max(-1, Math.min(1, samples[i]!));
    view.setInt16(i * 2, s < 0 ? s * 0x8000 : s * 0x7fff, true);
  }

  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]!);
  }

  return btoa(binary);
};
