/** assets/test.png -> assets/test@tag.png */
export const toOutputFilePath = (inputPath: string, tag: string): string => {
	const extIndex = inputPath.lastIndexOf(".");
	if (extIndex === -1) {
		return `${inputPath}@${tag}`;
	}
	const name = inputPath.substring(0, extIndex);
	const ext = inputPath.substring(extIndex);
	return `${name}@${tag}${ext}`;
};
