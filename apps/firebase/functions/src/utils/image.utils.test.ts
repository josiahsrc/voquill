import * as fs from "fs";
import sharp from "sharp";
import { toOutputFilePath } from "../../test/helpers/files";
import { resizeBase64Image } from "./image.utils";

describe("resizeBase64Image", () => {
  it("resizes an image to fit within max bounds", async () => {
    const inputPath = "assets/dont-sit-on-that.png";
    const inputBuffer = fs.readFileSync(inputPath);
    const inputBase64 = `data:image/png;base64,${inputBuffer.toString(
      "base64"
    )}`;

    const resizedBase64 = await resizeBase64Image({
      imageBase64: inputBase64,
      maxWidth: 100,
      maxHeight: 100,
    });

    expect(resizedBase64).toMatch(/^data:image\/jpeg;base64,/);
    const resizedBuffer = Buffer.from(resizedBase64.split(",")[1] ?? "", "base64");
    expect(resizedBuffer.length).toBeGreaterThan(0);

    // Optionally decode and inspect size
    const img = sharp(resizedBuffer);
    const meta = await img.metadata();
    expect(meta.width).toBeLessThanOrEqual(100);
    expect(meta.height).toBeLessThanOrEqual(100);

    fs.writeFileSync(
      toOutputFilePath("assets/dont-sit-on-that.jpeg", "resized"),
      resizedBuffer
    );
  });
});
