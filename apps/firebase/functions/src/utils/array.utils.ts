export const whereNotNull = <T>(
	array: Array<T | null | undefined>,
): Array<T> => {
	return array.filter((item): item is T => item !== null && item !== undefined);
};
