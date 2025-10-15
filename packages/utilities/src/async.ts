import { chunkify } from "./collections";

export const delayed = (ms: number) =>
  new Promise((resolve) => setTimeout(resolve, ms));

export const retry = async <T>(args: {
  fn: () => Promise<T>,
  retries?: number,
  delay?: number
}): Promise<T> => {
  const { fn, retries = 3, delay = 20 } = args;
  for (let i = 0; i < retries; i++) {
    try {
      return await fn();
    } catch (error) {
      if (i < retries - 1) {
        await delayed(delay);
      } else {
        throw error;
      }
    }
  }

  throw new Error("Retry limit exceeded");
};

export const batchAsync = async <T = void>(
  size: number,
  promises: (() => Promise<T>)[]
): Promise<T[]> => {
  const chunked = chunkify(promises, size);
  const results: T[] = [];
  for (const chunk of chunked) {
    const chunkResults = await Promise.all(chunk.map((fn) => fn()));
    results.push(...chunkResults);
  }
  return results;
};
