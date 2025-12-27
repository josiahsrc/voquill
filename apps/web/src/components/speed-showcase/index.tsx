import { useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import { FormattedMessage, useIntl } from "react-intl";
import { DownloadButton } from "../download-button";
import { fractalNoise1d } from "../../utils/perlin.utils";
import styles from "./speed-showcase.module.css";

const keyLabels = ["Q", "W", "E", "R", "T", "Y", "U", "I", "O", "P", "delete"];
const BACKSPACE_INDEX = keyLabels.length - 1;

type AnimatedStyle = CSSProperties & { "--delay"?: string };

// Script format: regular chars get typed, :N means backspace N times
const TYPING_SCRIPT =
  "Here's a reakkt:4ally long sentance:4ence that I have to type out and it jsut:3ust goes on forever.";

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

  // Wave animation refs
  const wave1Ref = useRef<SVGPathElement>(null);
  const wave2Ref = useRef<SVGPathElement>(null);
  const wave3Ref = useRef<SVGPathElement>(null);

  // Perlin noise wave animation
  useEffect(() => {
    let animationId: number;
    const startTime = Date.now();

    const animate = () => {
      const rawElapsed = (Date.now() - startTime) / 1000;
      // Modulate elapsed time with smooth Perlin noise (1 octave)
      const timeNoise = fractalNoise1d(rawElapsed * 0.3, 1, 0.5);
      const elapsed = rawElapsed + timeNoise * 2; // Varies by ±2 seconds

      // Each wave uses different speed and offset - slower, smoother variance
      if (wave1Ref.current) {
        const noise = fractalNoise1d(elapsed * 1.5, 1, 0.5);
        const scale = 0.2 + (noise + 1) * 0.5; // Range: 0.2 to 1.2
        wave1Ref.current.style.transform = `scaleY(${scale})`;
      }

      if (wave2Ref.current) {
        const noise = fractalNoise1d(elapsed * 1.1 + 50, 3, 0.5);
        const scale = 0.15 + (noise + 1) * 0.4; // Range: 0.15 to 0.95
        wave2Ref.current.style.transform = `scaleY(${scale})`;
      }

      if (wave3Ref.current) {
        const noise = fractalNoise1d(elapsed * 1.4 + 150, 3, 0.5);
        const scale = 0.2 + (noise + 1) * 0.3; // Range: 0.2 to 0.8
        wave3Ref.current.style.transform = `scaleY(${scale})`;
      }

      animationId = requestAnimationFrame(animate);
    };

    animationId = requestAnimationFrame(animate);

    return () => cancelAnimationFrame(animationId);
  }, []);

  useEffect(() => {
    const STEP_DURATION = 135;
    const HOLD_AT_END = 18;

    const interval = window.setInterval(() => {
      // Handle hold at end
      if (
        scriptIndexRef.current >= TYPING_SCRIPT.length &&
        backspacesRemainingRef.current === 0
      ) {
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
        <DownloadButton />
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
                {/* Wave 1: slower, wider sine wave */}
                <g className={styles.waveGroup1}>
                  <path
                    ref={wave1Ref}
                    className={styles.wavePath}
                    d="M0 40 C21 15, 42 15, 63 40 S105 65, 126 40 S168 15, 189 40 S231 65, 252 40 S294 15, 315 40 S357 65, 378 40 S420 15, 441 40 S483 65, 504 40 S546 15, 567 40"
                  />
                </g>
                {/* Wave 2: medium frequency sine wave */}
                <g className={styles.waveGroup2}>
                  <path
                    ref={wave2Ref}
                    className={styles.wavePath}
                    d="M0 40 C16 20, 32 20, 48 40 S80 60, 96 40 S128 20, 144 40 S176 60, 192 40 S224 20, 240 40 S272 60, 288 40 S320 20, 336 40 S368 60, 384 40 S416 20, 432 40 S464 60, 480 40 S512 20, 528 40"
                  />
                </g>
                {/* Wave 3: faster, tighter sine wave */}
                <g className={styles.waveGroup3}>
                  <path
                    ref={wave3Ref}
                    className={styles.wavePath}
                    d="M0 40 C11 25, 21 25, 32 40 S53 55, 64 40 S85 25, 96 40 S117 55, 128 40 S149 25, 160 40 S181 55, 192 40 S213 25, 224 40 S245 55, 256 40 S277 25, 288 40 S309 55, 320 40 S341 25, 352 40 S373 55, 384 40 S405 25, 416 40 S437 55, 448 40 S469 25, 480 40"
                  />
                </g>
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
