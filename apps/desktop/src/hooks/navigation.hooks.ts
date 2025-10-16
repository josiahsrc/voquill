import { useEffect, useMemo, useRef } from "react";
import { useLocation, useSearchParams } from "react-router-dom";
import type { AppState } from "../state/app.state";
import { produceAppState, useAppStore } from "../store";
import { Nullable } from "@repo/types";

type ParamSyncerArgs<V extends Nullable<string>[]> = {
  queryParamNames: string[];
  getStoreParam: (s: AppState) => V;
  setStoreParam: (s: AppState, v: V) => void;
};

const equal = (a: Nullable<string>[], b: Nullable<string>[]) =>
  a.length === b.length && a.every((v, i) => v === b[i]);

export const useParamSyncer = <V extends Nullable<string>[]>({
  queryParamNames,
  getStoreParam,
  setStoreParam,
}: ParamSyncerArgs<V>): void => {
  const [searchParams, setSearchParams] = useSearchParams();

  const storeVals = useAppStore(getStoreParam);
  const urlVals = queryParamNames.map((k) => searchParams.get(k));

  const prevStore = useRef<Nullable<string>[]>(storeVals);
  const prevUrl = useRef<Nullable<string>[]>(urlVals);

  useEffect(() => {
    const urlChanged = !equal(prevUrl.current, urlVals);
    const storeChanged = !equal(prevStore.current, storeVals);

    prevUrl.current = urlVals;
    prevStore.current = storeVals;

    if (urlChanged && !equal(urlVals, storeVals)) {
      produceAppState((draft) => setStoreParam(draft, urlVals as V));
    } else if (storeChanged && !equal(storeVals, urlVals)) {
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          queryParamNames.forEach((k, i) => {
            const v = storeVals[i];
            if (v && v !== "") next.set(k, v);
            else next.delete(k);
          });
          return next;
        },
        { replace: true },
      );
    }
  }, [urlVals.join(","), storeVals.join(",")]);
};

export const useConsumeQueryParams = (
  paramNames: string[],
  onConsume: (params: (string | null)[]) => void,
) => {
  const [searchParams, setSearchParams] = useSearchParams();

  useEffect(() => {
    const params: (string | null)[] = paramNames.map((name) =>
      searchParams.get(name),
    );
    const hasParam = params.some((value) => value !== null);

    if (hasParam) {
      onConsume(params);
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          paramNames.forEach((name) => next.delete(name));
          return next;
        },
        { replace: true },
      );
    }
  }, [searchParams.toString()]);
};

const pageMap: Record<string, string> = {
  worklist: "Worklist",
  users: "Users",
  settings: "Settings",
};

export const usePageName = () => {
  const location = useLocation();
  const path = location.pathname;

  return useMemo(() => {
    for (const key in pageMap) {
      if (path.includes(key)) {
        return pageMap[key];
      }
    }

    return null;
  }, [path]);
};
