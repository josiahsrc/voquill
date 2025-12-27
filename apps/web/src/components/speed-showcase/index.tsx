import { useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import { FormattedMessage, useIntl } from "react-intl";
import styles from "./speed-showcase.module.css";

const keyLabels = ["Q", "W", "E", "R", "T", "Y", "U", "I", "O", "P", "delete"];
const BACKSPACE_INDEX = keyLabels.length - 1;

type AnimatedStyle = CSSProperties & { "--delay"?: string };

// Script format: regular chars get typed, :N means backspace N times
const TYPING_SCRIPT = "Here's a reakkt:4ally long sentance:4ence that I have to type out and it jsut:3ust goes on forever.";

export default function SpeedShowcase() {
  const intl = useIntl();

  const displayScript = intl.formatMessage({
    defaultMessage:
      "Here's a really long sentence that I have to type out and it just goes on forever.",
  });
  const voiceWords = displayScript.split(" ");

  const [displayedText, setDisplayedText] = useState("");
  const [pressedKeyIndex, setPressedKeyIndex] = useState<number | null>(null);
  const scriptIndexRef = useRef(0);
  const holdTicksRef = useRef(0);
  const backspacesRemainingRef = useRef(0);
  const backspaceReleaseRef = useRef(false);

  useEffect(() => {
    const STEP_DURATION = 135;
    const HOLD_AT_END = 18;

    const interval = window.setInterval(() => {
      // Handle hold at end
      if (scriptIndexRef.current >= TYPING_SCRIPT.length && backspacesRemainingRef.current === 0) {
        if (holdTicksRef.current < HOLD_AT_END) {
          holdTicksRef.current += 1;
          setPressedKeyIndex(null);
          return;
        }
        // Reset
        holdTicksRef.current = 0;
        scriptIndexRef.current = 0;
        setDisplayedText("");
        setPressedKeyIndex(null);
        return;
      }

      // Handle backspacing with press/release cycle
      if (backspacesRemainingRef.current > 0) {
        if (backspaceReleaseRef.current) {
          // Release phase - just lift the key
          setPressedKeyIndex(null);
          backspaceReleaseRef.current = false;
        } else {
          // Press phase - delete a character
          setPressedKeyIndex(BACKSPACE_INDEX);
          setDisplayedText((t) => t.slice(0, -1));
          backspacesRemainingRef.current -= 1;
          backspaceReleaseRef.current = true;
        }
        return;
      }

      const currentChar = TYPING_SCRIPT[scriptIndexRef.current];

      // Check for backspace command (:N)
      if (currentChar === ":") {
        const nextChar = TYPING_SCRIPT[scriptIndexRef.current + 1] ?? "";
        const count = parseInt(nextChar, 10);
        if (!isNaN(count)) {
          backspacesRemainingRef.current = count;
          scriptIndexRef.current += 2; // Skip past :N
          return;
        }
      }

      // Normal typing
      setDisplayedText((t) => t + currentChar);
      scriptIndexRef.current += 1;
      const randomIndex = Math.floor(Math.random() * (keyLabels.length - 1));
      setPressedKeyIndex(randomIndex);
    }, STEP_DURATION);

    return () => window.clearInterval(interval);
  }, []);

  const keyboardScriptCurrent = displayedText;

  return (
    <section className={styles.speedShowcase} id="speed">
      <div className={styles.sectionIntro}>
        <span className={styles.badge}>
          <FormattedMessage defaultMessage="4× faster than typing" />
        </span>
        <h2>
          <FormattedMessage defaultMessage="Your voice outruns your keyboard." />
        </h2>
        <p>
          <FormattedMessage defaultMessage="Your thoughts move faster than your fingers ever will. Stop losing ideas to slow typing. Say what you're thinking and move on." />
        </p>
      </div>
      <div className={styles.showcaseGrid}>
        <article className={styles.keyboardPane}>
          <header className={styles.paneHeader}>
            <span>
              <FormattedMessage defaultMessage="Keyboard" />
            </span>
            <span className={styles.paneMetric}>
              <FormattedMessage defaultMessage="~45 wpm" />
            </span>
          </header>
          <div className={styles.keyboardVisual}>
            <div className={styles.keyDeck}>
              {keyLabels.map((label, index) => (
                <span
                  key={`${label}-${index}`}
                  className={`${styles.key} ${index === BACKSPACE_INDEX ? styles.keyBackspace : ""} ${pressedKeyIndex === index ? styles.keyPressed : ""}`}
                >
                  {label}
                </span>
              ))}
            </div>
            <div className={styles.typingOutput} aria-label={displayScript}>
              <span className={styles.typingLine} aria-hidden="true">
                {keyboardScriptCurrent}
                <span className={styles.typingCaret}>|</span>
              </span>
            </div>
          </div>
          <p className={styles.keyboardFooter}>
            <FormattedMessage defaultMessage="One letter at a time." />
          </p>
        </article>

        <article className={styles.voicePane}>
          <header className={styles.paneHeader}>
            <span>
              <FormattedMessage defaultMessage="Voquill voice" />
            </span>
            <span className={styles.paneMetricHot}>
              <FormattedMessage defaultMessage="~220 wpm" />
            </span>
          </header>
          <div className={styles.voiceVisual}>
            <div className={styles.waveform}>
              <svg
                className={styles.waveSvg}
                viewBox="0 0 336 80"
                aria-hidden="true"
              >
                <defs>
                  <linearGradient id="waveGradient" x1="0%" x2="100%">
                    <stop offset="0%" stopColor="rgba(191, 219, 254, 0.55)" />
                    <stop offset="100%" stopColor="rgba(59, 130, 246, 0.95)" />
                  </linearGradient>
                </defs>
                <path
                  className={`${styles.wavePath} ${styles.waveSlow}`}
                  d="M20 40 C40 10 60 10 80 40 S120 70 140 40 180 10 200 40 240 70 260 40 300 10 320 40 340 70 356 40"
                />
                <path
                  className={`${styles.wavePath} ${styles.waveMid}`}
                  d="M20 42 C44 18 68 18 92 42 S140 66 164 42 212 18 236 42 284 66 308 42 332 18 356 42"
                />
                <path
                  className={`${styles.wavePath} ${styles.waveFast}`}
                  d="M20 38 C48 14 76 14 104 38 S160 62 188 38 244 14 272 38 316 62 340 38 364 14 356 38"
                />
              </svg>
              <div className={styles.waveGlow} />
            </div>
            <div className={styles.voiceOutput}>
              <span className={styles.voiceLine} aria-label={displayScript}>
                {voiceWords.map((word, index) => (
                  <span
                    key={`${word}-${index}`}
                    className={styles.voiceWord}
                    style={
                      {
                        "--delay": `${index * 0.1}s`,
                      } as AnimatedStyle
                    }
                  >
                    {word}
                  </span>
                ))}
              </span>
            </div>
          </div>
          <p className={styles.voiceFooter}>
            <FormattedMessage defaultMessage="Works at the speed of thought." />
          </p>
        </article>
      </div>
    </section>
  );
}
