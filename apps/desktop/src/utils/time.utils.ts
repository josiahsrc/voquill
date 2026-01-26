export const daysToMilliseconds = (days: number): number => {
  return days * 24 * 60 * 60 * 1000;
};

export const hoursToMilliseconds = (hours: number): number => {
  return hours * 60 * 60 * 1000;
};

export const minutesToMilliseconds = (minutes: number): number => {
  return minutes * 60 * 1000;
};
