import { useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import styles from "./speed-showcase.module.css";

const keyLabels = ["Q", "W", "E", "R", "T", "Y", "U", "I", "O", "P", "A", "S"];
const typingScript =
  "Here's a really long sentence that I have to type out and it just goes on forever.";
const voiceWords = typingScript.split(" ");

type AnimatedStyle = CSSProperties & { "--delay"?: string };

export default function SpeedShowcase() {
  const totalChars = typingScript.length;
  const [visibleCharCount, setVisibleCharCount] = useState(0);
  const directionRef = useRef<1 | -1>(1);
  const holdTicksRef = useRef(0);

  useEffect(() => {
    if (!totalChars) {
      return;
    }

    const STEP_DURATION = 135;
    const HOLD_AT_END = 18;
    const HOLD_AT_START = 8;

    const interval = window.setInterval(() => {
      setVisibleCharCount((current) => {
        const direction = directionRef.current;
        const nextCount = current + direction;

        if (direction > 0 && nextCount > totalChars) {
          if (holdTicksRef.current < HOLD_AT_END) {
            holdTicksRef.current += 1;
            return current;
          }
          directionRef.current = -1;
          holdTicksRef.current = 0;
          return Math.max(current - 1, 0);
        }

        if (direction < 0 && nextCount < 0) {
          if (holdTicksRef.current < HOLD_AT_START) {
            holdTicksRef.current += 1;
            return current;
          }
          directionRef.current = 1;
          holdTicksRef.current = 0;
          return Math.min(current + 1, totalChars);
        }

        holdTicksRef.current = 0;
        return nextCount;
      });
    }, STEP_DURATION);

    return () => window.clearInterval(interval);
  }, [totalChars]);

  const keyboardScriptCurrent = typingScript.slice(0, visibleCharCount);

  return (
    <section className={styles.speedShowcase} id="speed">
      <div className={styles.sectionIntro}>
        <span className={styles.badge}>4× faster than typing</span>
        <h2>Voice runs circles around your keyboard.</h2>
        <p>
          You speak at two hundred words per minute while manual keystrokes
          stall out at fifty. With Voquill, narrated sentences land whole so you
          never lose the thread to backspacing.
        </p>
      </div>
      <div className={styles.showcaseGrid}>
        <article className={styles.keyboardPane}>
          <header className={styles.paneHeader}>
            <span>Keyboard</span>
            <span className={styles.paneMetric}>≈ 50 wpm</span>
          </header>
          <div className={styles.keyboardVisual}>
            <div className={styles.keyDeck}>
              {keyLabels.map((label, index) => (
                <span
                  key={`${label}-${index}`}
                  className={styles.key}
                  style={
                    {
                      "--delay": `${index * 0.24}s`,
                    } as AnimatedStyle
                  }
                >
                  {label}
                </span>
              ))}
            </div>
            <div className={styles.typingOutput} aria-label={typingScript}>
              <span className={styles.typingLine} aria-hidden="true">
                {keyboardScriptCurrent}
                <span className={styles.typingCaret}>|</span>
              </span>
            </div>
          </div>
          <p className={styles.keyboardFooter}>Wow, that&apos;s slow.</p>
        </article>

        <article className={styles.voicePane}>
          <header className={styles.paneHeader}>
            <span>Voquill voice</span>
            <span className={styles.paneMetricHot}>≈ 220 wpm</span>
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
              <span className={styles.voiceLine} aria-label={typingScript}>
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
            Write at the speed of thought. Words materialize faster than you can blink.
          </p>
        </article>
      </div>
    </section>
  );
}
