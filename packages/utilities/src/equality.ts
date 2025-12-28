export const truthyEquals = <T>(a: T, b: T): boolean => {
  if (!a && !b) {
    return true;
  }

  return a == b;
};

export const isDefined = <T>(value: T | undefined | null): value is T => {
  return value !== undefined && value !== null;
};

export const isNotDefined = <T>(
  value: T | undefined | null,
): value is undefined | null => {
  return !isDefined(value);
};
