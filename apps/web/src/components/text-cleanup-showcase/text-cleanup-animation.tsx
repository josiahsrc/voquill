import { useEffect, useState, useRef, useCallback } from "react";
import styles from "./text-cleanup-animation.module.css";

type CleanupType = "filler" | "typo" | "hesitation";

interface WordToken {
  id: number;
  text: string;
  cleanup?: {
    type: CleanupType;
    label: string;
    replacement?: string;
  };
}

type WordPhase = "hidden" | "typing" | "visible" | "flagged" | "cleaned";

interface WordState {
  phase: WordPhase;
  charIndex: number;
}

const TOKENS: WordToken[] = [
  { id: 1, text: "I was...", cleanup: { type: "filler", label: "False start" } },
  { id: 2, text: "I" },
  { id: 3, text: "was" },
  { id: 4, text: "thinking," },
  { id: 5, text: "um,", cleanup: { type: "hesitation", label: "Hesitation" } },
  { id: 6, text: "we" },
  { id: 7, text: "should" },
  { id: 8, text: "meet" },
  { id: 9, text: "with" },
  {
    id: 10,
    text: "Tomas",
    cleanup: { type: "typo", label: "Spelling", replacement: "Thomas" },
  },
  { id: 11, text: "at" },
  { id: 12, text: "3pm." },
];

// Timing constants (ms)
const CHAR_DELAY = 50;
const WORD_PAUSE = 200;
const FLAG_DELAY = 500;
const CLEAN_DELAY = 700;
const RESTART_DELAY = 3000;

const createInitialStates = (): WordState[] =>
  TOKENS.map(() => ({ phase: "hidden" as const, charIndex: 0 }));

export default function TextCleanupAnimation() {
  const [wordStates, setWordStates] =
    useState<WordState[]>(createInitialStates);
  const [isComplete, setIsComplete] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const animationRef = useRef({ wordIndex: 0, isRunning: true });

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const scheduleNext = useCallback(
    (callback: () => void, delay: number) => {
      clearTimer();
      timerRef.current = setTimeout(callback, delay);
    },
    [clearTimer],
  );

  const tick = useCallback(() => {
    if (!animationRef.current.isRunning) return;

    setWordStates((prevStates) => {
      const { wordIndex } = animationRef.current;

      // Animation complete - schedule restart
      if (wordIndex >= TOKENS.length) {
        setIsComplete(true);
        scheduleNext(() => {
          animationRef.current.wordIndex = 0;
          setIsComplete(false);
          setWordStates(createInitialStates());
          scheduleNext(tick, 100);
        }, RESTART_DELAY);
        return prevStates;
      }

      const token = TOKENS[wordIndex]!;
      const state = prevStates[wordIndex]!;
      const newStates = [...prevStates];

      switch (state.phase) {
        case "hidden":
          // Start typing
          newStates[wordIndex] = { phase: "typing", charIndex: 1 };
          scheduleNext(tick, CHAR_DELAY);
          break;

        case "typing":
          if (state.charIndex < token.text.length) {
            // Continue typing
            newStates[wordIndex] = {
              phase: "typing",
              charIndex: state.charIndex + 1,
            };
            scheduleNext(tick, CHAR_DELAY);
          } else {
            // Word complete
            newStates[wordIndex] = {
              phase: "visible",
              charIndex: state.charIndex,
            };
            if (token.cleanup) {
              scheduleNext(tick, FLAG_DELAY);
            } else {
              // Move to next word
              animationRef.current.wordIndex++;
              scheduleNext(tick, WORD_PAUSE);
            }
          }
          break;

        case "visible":
          if (token.cleanup) {
            // Flag this word
            newStates[wordIndex] = {
              phase: "flagged",
              charIndex: state.charIndex,
            };
            scheduleNext(tick, CLEAN_DELAY);
          }
          break;

        case "flagged":
          // Clean up
          newStates[wordIndex] = {
            phase: "cleaned",
            charIndex: state.charIndex,
          };
          animationRef.current.wordIndex++;
          scheduleNext(tick, WORD_PAUSE);
          break;

        case "cleaned":
          // Already cleaned, move on
          animationRef.current.wordIndex++;
          scheduleNext(tick, WORD_PAUSE);
          break;
      }

      return newStates;
    });
  }, [scheduleNext]);

  // Start animation on mount
  useEffect(() => {
    animationRef.current.isRunning = true;
    scheduleNext(tick, 500); // Initial delay before starting

    return () => {
      animationRef.current.isRunning = false;
      clearTimer();
    };
  }, [tick, scheduleNext, clearTimer]);

  const renderWord = (token: WordToken, state: WordState) => {
    const { phase, charIndex } = state;
    const { text, cleanup } = token;

    if (phase === "hidden") {
      return null;
    }

    const displayText = phase === "typing" ? text.slice(0, charIndex) : text;
    const isRemoval = cleanup && !cleanup.replacement;
    const hasReplacement = cleanup?.replacement;

    const wordClasses = [
      styles.word,
      phase === "flagged" && styles.wordFlagged,
      phase === "cleaned" && isRemoval && styles.wordRemoved,
      phase === "cleaned" && hasReplacement && styles.wordReplaced,
    ]
      .filter(Boolean)
      .join(" ");

    return (
      <span className={styles.wordContainer} key={token.id}>
        <span className={wordClasses}>{displayText}</span>

        {/* Cleanup label */}
        {cleanup && (phase === "flagged" || phase === "cleaned") && (
          <span
            className={`${styles.label} ${phase === "cleaned" ? styles.labelDone : ""}`}
            data-type={cleanup.type}
          >
            {cleanup.label}
          </span>
        )}

        {/* Replacement word */}
        {hasReplacement && phase === "cleaned" && (
          <span className={styles.replacement}>{cleanup.replacement}</span>
        )}

        <span className={styles.space}> </span>
      </span>
    );
  };

  const cleanedText = "I was thinking we should meet with Thomas at 3pm.";

  return (
    <div className={styles.container}>
      <div className={styles.transcriptBox}>
        <div className={styles.transcript}>
          {TOKENS.map((token, i) => {
            const state = wordStates[i];
            if (!state) return null;
            return renderWord(token, state);
          })}
        </div>
      </div>

      <div className={styles.arrow}>
        <svg
          className={styles.arrowIcon}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <line x1="12" y1="5" x2="12" y2="19" />
          <polyline points="19 12 12 19 5 12" />
        </svg>
      </div>

      <div
        className={`${styles.resultBox} ${isComplete ? styles.resultBoxComplete : styles.resultBoxPending}`}
      >
        <div
          className={`${styles.resultText} ${isComplete ? styles.resultTextVisible : ""}`}
        >
          {isComplete ? cleanedText : ""}
        </div>
      </div>
    </div>
  );
}
