import {
  type DependencyList,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

export function usePrevious<T>(value: T): T | undefined;
export function usePrevious<T>(value: T, initialValue: T): T;
export function usePrevious<T>(value: T, initialValue?: T): T | undefined {
  const hasInitialValue = arguments.length >= 2;
  const ref = useRef<T | undefined>(initialValue);
  useEffect(() => {
    ref.current = value;
  }, [value]);
  return hasInitialValue ? (ref.current as T) : ref.current;
}

export const useDelayedEffect = (
  delay: number,
  callback: () => void,
  deps: DependencyList,
) => {
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    timeoutRef.current = setTimeout(() => {
      callback();
    }, delay);

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, deps);
};

export const useOnEnter = (callback: () => void) => {
  useEffect(() => {
    callback();
  }, []);
};

export const useOnExit = (callback: () => void) => {
  useEffect(() => {
    return () => {
      callback();
    };
  }, []);
};

export const useKeyDownHandler = (args: {
  keys?: string[];
  shift?: boolean;
  ctrl?: boolean;
  meta?: boolean;
  alt?: boolean;
  callback?: (event: KeyboardEvent) => void;
}): void => {
  const { keys, shift, ctrl, meta, alt, callback: downHandler } = args;

  const downRef = useRef<typeof downHandler>(downHandler);
  const lastMatchRef = useRef<string | null>(null);

  useEffect(() => {
    downRef.current = downHandler;
  }, [downHandler]);

  useEffect(() => {
    const matchesKey = (e: KeyboardEvent) =>
      keys ? keys.some((k) => k.toLowerCase() === e.key.toLowerCase()) : true;

    const modifiersMatch = (e: KeyboardEvent) => {
      if (shift !== undefined && e.shiftKey !== shift) return false;
      if (ctrl !== undefined && e.ctrlKey !== ctrl) return false;
      if (meta !== undefined && e.metaKey !== meta) return false;
      if (alt !== undefined && e.altKey !== alt) return false;
      return true;
    };

    const keydownListener = (e: KeyboardEvent) => {
      if (!matchesKey(e)) return;
      if (!modifiersMatch(e)) return;
      lastMatchRef.current = e.key;
      downRef.current?.(e);
    };

    if (downRef.current) {
      window.addEventListener("keydown", keydownListener);
    }

    return () => {
      window.removeEventListener("keydown", keydownListener);
    };
  }, [keys, shift, ctrl, meta, alt]);
};

type UseKeyComboArgs = {
  keys?: string[];
  shift?: boolean;
  ctrl?: boolean;
  meta?: boolean;
  alt?: boolean;
};

/**
 * Returns true while the specified key combo is held.
 * - Only `true` values for modifiers are enforced. `false`/`undefined` mean "don't care".
 * - `keys` is treated as a required subset. Extra pressed keys are ignored.
 * - Ignores modifier names inside `keys`.
 */
export const useKeyCombo = (args: UseKeyComboArgs = {}): boolean => {
  const [active, setActive] = useState(false);
  const pressedRef = useRef<Set<string>>(new Set());

  // Canonicalize to stable lowercase tokens
  const canon = (k: string): string => {
    const s = k.trim().toLowerCase();
    if (s === " " || s === "space") return "space";
    if (s === "esc" || s === "escape") return "escape";
    if (s === "return" || s === "enter") return "enter";
    if (s === "del" || s === "delete") return "delete";
    if (s === "arrowup" || s === "up") return "arrowup";
    if (s === "arrowdown" || s === "down") return "arrowdown";
    if (s === "arrowleft" || s === "left") return "arrowleft";
    if (s === "arrowright" || s === "right") return "arrowright";
    return s;
  };

  const isModifierKey = (k: string) =>
    k === "shift" || k === "control" || k === "alt" || k === "meta";

  const requiredKeys = useMemo<Set<string>>(() => {
    const list = (args.keys ?? []).map(canon).filter((k) => !isModifierKey(k));
    return new Set(list);
  }, [JSON.stringify(args.keys ?? [])]); // stable deps even if array identity changes

  const checkActive = (ev?: KeyboardEvent) => {
    // Evaluate modifiers from the latest event when available, else from global state
    const shift = ev ? ev.shiftKey : false;
    const ctrl = ev ? ev.ctrlKey : false;
    const alt = ev ? ev.altKey : false;
    const meta = ev ? ev.metaKey : false;

    // Enforce requested modifiers (only when true)
    if (args.shift && !shift) return false;
    if (args.ctrl && !ctrl) return false;
    if (args.alt && !alt) return false;
    if (args.meta && !meta) return false;

    // All required non-modifier keys must be down (subset semantics)
    for (const k of requiredKeys) {
      if (!pressedRef.current.has(k)) return false;
    }
    return true;
  };

  // Re-evaluate when requirements change
  useEffect(() => {
    setActive(checkActive());
  }, [args.shift, args.ctrl, args.alt, args.meta, requiredKeys]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const addKey = (raw: string) => {
      const k = canon(raw);
      if (!isModifierKey(k)) pressedRef.current.add(k);
    };
    const removeKey = (raw: string) => {
      const k = canon(raw);
      if (!isModifierKey(k)) pressedRef.current.delete(k);
    };

    const onKeyDown = (e: KeyboardEvent) => {
      addKey(e.key);
      setActive(checkActive(e));
    };
    const onKeyUp = (e: KeyboardEvent) => {
      removeKey(e.key);
      setActive(checkActive(e));
    };
    const clearAll = () => {
      pressedRef.current.clear();
      setActive(false);
    };
    const onVisibility = () => {
      if (document.visibilityState !== "visible") clearAll();
    };

    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    window.addEventListener("blur", clearAll);
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      window.removeEventListener("blur", clearAll);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, []);

  return active;
};

type IntervalCallback = () => void;

export const useInterval = (
  delay: number,
  callback: IntervalCallback,
  dependencies: DependencyList,
) => {
  const savedCallback = useRef<IntervalCallback>(null);
  const intervalIdRef = useRef<NodeJS.Timeout>(null);

  useEffect(() => {
    savedCallback.current = callback;
  }, [callback]);

  useEffect(() => {
    function tick() {
      if (savedCallback.current) {
        savedCallback.current();
      }
    }

    tick();

    if (intervalIdRef.current) clearInterval(intervalIdRef.current);
    intervalIdRef.current = setInterval(tick, delay);

    return () => {
      if (intervalIdRef.current) clearInterval(intervalIdRef.current);
    };
  }, [delay, ...dependencies]);
};

export const useIntervalAsync = (
  delay: number,
  callback: () => Promise<void>,
  dependencies: DependencyList,
) => {
  const running = useRef(false);
  useInterval(
    delay,
    async () => {
      if (running.current) return;
      running.current = true;
      try {
        await callback();
      } finally {
        running.current = false;
      }
    },
    dependencies,
  );
};

export const useDebouncedState = <T>(
  initial: T,
): [T, (newValue: T, delay?: number) => void] => {
  const [state, setState] = useState<T>(initial);
  const timerRef = useRef<ReturnType<typeof setTimeout>>(null);

  const setDebounced = useCallback((newValue: T, delay: number = 0) => {
    if (timerRef.current) clearTimeout(timerRef.current);
    if (delay <= 0) {
      setState(newValue);
    } else {
      timerRef.current = setTimeout(() => setState(newValue), delay);
    }
  }, []);

  useEffect(
    () => () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    },
    [],
  );

  return [state, setDebounced];
};

type EffectCallback = () => void | (() => void);

export const useEffectDebounced = (
  delay: number,
  effect: EffectCallback,
  deps: DependencyList,
): void => {
  const callback = useRef<EffectCallback>(effect);
  const timer = useRef<NodeJS.Timeout>(null);

  useEffect(() => {
    callback.current = effect;
  }, [effect]);

  useEffect(() => {
    const execute = () => {
      callback.current();
    };

    if (timer.current) {
      clearTimeout(timer.current);
    }

    timer.current = setTimeout(execute, delay);

    return () => {
      if (timer.current) {
        clearTimeout(timer.current);
      }
    };
  }, [delay, ...deps]);
};

export const useCallbackDebounced = <T extends (...args: any[]) => any>(
  delay: number,
  callback: T,
  deps: DependencyList = [],
): ((...args: Parameters<T>) => void) => {
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  return useCallback(
    (...args: Parameters<T>) => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      timeoutRef.current = setTimeout(() => {
        callback(...args);
      }, delay);
    },
    [delay, ...deps],
  );
};
