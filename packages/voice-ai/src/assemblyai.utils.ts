export type AssemblyAITestIntegrationArgs = {
  apiKey: string;
};

export const assemblyaiTestIntegration = async ({
  apiKey,
}: AssemblyAITestIntegrationArgs): Promise<boolean> => {
  try {
    const response = await fetch("https://api.assemblyai.com/v2/transcript", {
      method: "GET",
      headers: { Authorization: apiKey },
    });
    return response.ok || response.status === 404;
  } catch {
    return false;
  }
};

export const convertFloat32ToPCM16 = (
  float32Array: Float32Array | number[],
): ArrayBuffer => {
  const samples = Array.isArray(float32Array)
    ? float32Array
    : Array.from(float32Array);
  const buffer = new ArrayBuffer(samples.length * 2);
  const view = new DataView(buffer);

  for (let i = 0; i < samples.length; i++) {
    const s = Math.max(-1, Math.min(1, samples[i]));
    view.setInt16(i * 2, s < 0 ? s * 0x8000 : s * 0x7fff, true);
  }

  return buffer;
};
