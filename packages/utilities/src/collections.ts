export function getRec<K extends number | string, V>(
  map?: Record<K, V>,
  key?: K | null,
  fallback?: V
): V | undefined {
  const missingKey = key === null || key === undefined;
  const inner = map ?? ({} as Record<K, V>);
  return missingKey
    ? fallback
    : inner[key] !== undefined
      ? inner[key]
      : fallback;
}

export const listify = <T>(values?: T | T[] | null): T[] => {
  if (values === undefined || values === null) {
    return [];
  }
  return Array.isArray(values) ? values : [values];
};

export function chunkify<T>(values: T[], size: number): T[][] {
  const chunks = [];
  for (let i = 0; i < values.length; i += size) {
    chunks.push(values.slice(i, i + size));
  }
  return chunks;
}
