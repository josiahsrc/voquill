export const buildSilenceWavBase64 = (
	seconds: number,
	sampleRate = 16_000,
): string => {
	if (seconds <= 0) {
		throw new Error("Seconds must be greater than zero");
	}

	if (sampleRate <= 0) {
		throw new Error("Sample rate must be greater than zero");
	}

	const channels = 1;
	const bitsPerSample = 16;
	const bytesPerSample = (bitsPerSample / 8) * channels;
	const dataSize = Math.max(
		bytesPerSample,
		Math.round(seconds * sampleRate * bytesPerSample),
	);
	const buffer = Buffer.alloc(44 + dataSize);

	buffer.write("RIFF", 0);
	buffer.writeUInt32LE(36 + dataSize, 4);
	buffer.write("WAVE", 8);
	buffer.write("fmt ", 12);
	buffer.writeUInt32LE(16, 16);
	buffer.writeUInt16LE(1, 20);
	buffer.writeUInt16LE(channels, 22);
	buffer.writeUInt32LE(sampleRate, 24);
	buffer.writeUInt32LE(sampleRate * bytesPerSample, 28);
	buffer.writeUInt16LE(bytesPerSample, 32);
	buffer.writeUInt16LE(bitsPerSample, 34);
	buffer.write("data", 36);
	buffer.writeUInt32LE(dataSize, 40);

	return buffer.toString("base64");
};
