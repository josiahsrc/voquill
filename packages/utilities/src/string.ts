export const countWords = (text: string): number => {
  const words = text.trim().split(/\s+/);
  return words
    .filter((word) => word.length > 0)
    .reduce((count, word) => {
      return count + Math.ceil(word.length / 100);
    }, 0);
};
