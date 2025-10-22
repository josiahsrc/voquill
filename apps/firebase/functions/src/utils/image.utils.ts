import sharp from "sharp";

export const resizeBase64Image = async (args: {
  imageBase64: string;
  maxWidth: number;
  maxHeight: number;
}): Promise<string> => {
  const { imageBase64, maxWidth, maxHeight } = args;

  // Strip optional data URL prefix if present
  const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, "");
  const buffer = Buffer.from(base64Data, "base64");

  // Resize image using Sharp
  const resizedBuffer = await sharp(buffer)
    .resize(maxWidth, maxHeight, {
      fit: "inside",
      withoutEnlargement: true,
    })
    .jpeg({ quality: 80 })
    .toBuffer();

  return `data:image/jpeg;base64,${resizedBuffer.toString("base64")}`;
};
