type AsyncState<T> =
  | {
    state: "loading";
  }
  | {
    state: "error";
    error: string;
  }
  | {
    state: "success";
    data: T;
  };

export type AsyncData<T> = AsyncState<T> & {
  refresh: () => Promise<void>;
};
