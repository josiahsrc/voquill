export type Nullable<T> = T | null;

export type EmptyObject = Record<string, never>;

export type JsonResponse = {
  name: string;
  description?: string;
  schema: Record<string, unknown>;
};
