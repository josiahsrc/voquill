import { useEffect, useState } from "react";
import { useIntl } from "react-intl";
import styles from "./text-cleanup-showcase.module.css";

const INITIAL_DELAY = 2000; // Show before text for 2 seconds
const GRAY_DELAY = 800; // Show grayed words for 800ms
const TRANSITION_DURATION = 600; // Blur transition duration
const SHOW_AFTER_DELAY = 2000; // Show after text for 2 seconds

export default function TextCleanupShowcase() {
  const intl = useIntl();
  const [phase, setPhase] = useState<"before" | "graying" | "transitioning" | "after">("before");

  const BEFORE_TEXT = intl.formatMessage({
    defaultMessage: "Soo umm I was thinkin we shud probaly uhh meet tommorow at like 3pm or somthing.",
  });
  const AFTER_TEXT = intl.formatMessage({
    defaultMessage: "So I was thinking we should probably meet tomorrow at 3pm or something.",
  });

  const BAD_WORDS = ["Soo", "umm", "thinkin", "shud", "probaly", "uhh", "tommorow", "like", "somthing"];

  useEffect(() => {
    const timer1 = setTimeout(() => setPhase("graying"), INITIAL_DELAY);
    const timer2 = setTimeout(() => setPhase("transitioning"), INITIAL_DELAY + GRAY_DELAY);
    const timer3 = setTimeout(
      () => setPhase("after"),
      INITIAL_DELAY + GRAY_DELAY + TRANSITION_DURATION
    );
    const timer4 = setTimeout(
      () => setPhase("before"),
      INITIAL_DELAY + GRAY_DELAY + TRANSITION_DURATION + SHOW_AFTER_DELAY
    );

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
      clearTimeout(timer3);
      clearTimeout(timer4);
    };
  }, [phase]);

  const renderBeforeText = () => {
    const words = BEFORE_TEXT.split(" ");
    return words.map((word, index) => {
      const isBad = BAD_WORDS.includes(word.replace(/[.,!?;]/, ""));
      const shouldGray = phase === "graying" || phase === "transitioning";
      return (
        <span
          key={index}
          className={`${styles.word} ${isBad && shouldGray ? styles.wordBad : ""}`}
        >
          {word}{" "}
        </span>
      );
    });
  };

  return (
    <div className={styles.showcase}>
      <div className={styles.textContainer}>
        <div
          className={`${styles.sentence} ${phase === "transitioning" ? styles.sentenceBlurOut : ""} ${phase === "after" ? styles.sentenceHidden : ""}`}
        >
          {renderBeforeText()}
        </div>
        <div
          className={`${styles.sentence} ${styles.sentenceAfter} ${phase === "transitioning" ? styles.sentenceBlurIn : ""} ${phase === "after" ? styles.sentenceVisible : ""}`}
        >
          {AFTER_TEXT}
        </div>
      </div>
    </div>
  );
}
