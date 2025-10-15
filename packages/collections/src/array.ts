export const listify = <T>(values?: T | T[] | null): T[] => {
  if (values === undefined || values === null) {
    return [];
  }
  return Array.isArray(values) ? values : [values];
};
