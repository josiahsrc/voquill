import { useEffect, useRef, useState, type DependencyList } from "react";
import type { Observable, Subscription } from "rxjs";

export type SuccessStreamResult<R> = {
  status: "success";
  data: R;
};

export type ErrorStreamResult = {
  status: "error";
  error: unknown;
};

export type LoadingStreamResult = {
  status: "loading";
};

export type StreamResult<R> =
  | SuccessStreamResult<R>
  | ErrorStreamResult
  | LoadingStreamResult;

export function useStream<R>(
  builder: () => Promise<Observable<R>> | Observable<R>,
  dependencies?: DependencyList,
): StreamResult<R> {
  const [result, setResult] = useState<StreamResult<R>>({
    status: "loading",
  });

  const subscriptionRef = useRef<Subscription | null>(null);

  useEffect(() => {
    let subscription: Subscription | null = null;

    async function setupStream() {
      try {
        const stream$ = await builder();
        subscription = stream$.subscribe(
          (data) => setResult({ status: "success", data }),
          (error) => setResult({ status: "error", error }),
        );
        subscriptionRef.current = subscription;
      } catch (error) {
        setResult({ status: "error", error });
      }
    }

    setupStream();

    return () => {
      subscription?.unsubscribe();
    };
  }, dependencies);

  return result;
}

export function useStreamWithSideEffects<R>(args: {
  builder: () => Promise<Observable<R>> | Observable<R>;
  dependencies?: DependencyList;
  onInit?: () => void;
  onSuccess?: (data: R) => void;
  onError?: (error: unknown) => void;
}): StreamResult<R> {
  const dataStream = useStream(args.builder, args.dependencies);

  useEffect(() => {
    args.onInit?.();
  }, args.dependencies);

  useEffect(() => {
    if (dataStream.status === "success" && args.onSuccess) {
      args.onSuccess(dataStream.data);
    } else if (dataStream.status === "error") {
      if (args.onError) {
        args.onError(dataStream.error);
      } else {
        throw new Error(`Unable to fetch data: ${dataStream.error}`);
      }
    }
  }, [dataStream]);

  return dataStream;
}
