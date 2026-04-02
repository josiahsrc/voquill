export type CustomFetch = (
  input: string | URL | Request,
  init?: RequestInit,
) => Promise<Response>;
