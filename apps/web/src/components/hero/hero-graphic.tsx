import { useMemo } from "react";
import styles from "./hero.module.css";

// Bezier curve type
type BezierCurve = {
  start: { x: number; y: number };
  cp1: { x: number; y: number };
  cp2: { x: number; y: number };
  end: { x: number; y: number };
};

// Get point on cubic Bezier at t (0-1)
const bezierPoint = (curve: BezierCurve, t: number) => {
  const mt = 1 - t;
  const mt2 = mt * mt;
  const mt3 = mt2 * mt;
  const t2 = t * t;
  const t3 = t2 * t;

  const x =
    mt3 * curve.start.x +
    3 * mt2 * t * curve.cp1.x +
    3 * mt * t2 * curve.cp2.x +
    t3 * curve.end.x;
  const y =
    mt3 * curve.start.y +
    3 * mt2 * t * curve.cp1.y +
    3 * mt * t2 * curve.cp2.y +
    t3 * curve.end.y;

  // Tangent for perpendicular direction
  const dx =
    3 * mt2 * (curve.cp1.x - curve.start.x) +
    6 * mt * t * (curve.cp2.x - curve.cp1.x) +
    3 * t2 * (curve.end.x - curve.cp2.x);
  const dy =
    3 * mt2 * (curve.cp1.y - curve.start.y) +
    6 * mt * t * (curve.cp2.y - curve.cp1.y) +
    3 * t2 * (curve.end.y - curve.cp2.y);

  const angle = Math.atan2(dy, dx);

  return { x, y, angle };
};

// Generate SVG path string for a sine wave along a bezier curve at a specific time/phase
const generateWavePath = (
  curve: BezierCurve,
  frequency: number,
  amplitude: number,
  timeOffset: number,
  segments: number = 100
): string => {
  const points: string[] = [];

  for (let i = 0; i <= segments; i++) {
    const t = i / segments;
    const { x, y, angle } = bezierPoint(curve, t);

    // Perpendicular direction
    const perpX = -Math.sin(angle);
    const perpY = Math.cos(angle);

    // Sine wave with time-based phase offset
    const phase = t * frequency * Math.PI * 2 - timeOffset;
    const sineValue = Math.sin(phase) * amplitude;

    // Fade in/out at ends
    const fadeIn = Math.min(1, t * 5);
    const fadeOut = Math.min(1, (1 - t) * 5);
    const fade = fadeIn * fadeOut;

    const px = x + perpX * sineValue * fade;
    const py = y + perpY * sineValue * fade;

    if (i === 0) {
      points.push(`M ${px} ${py}`);
    } else {
      points.push(`L ${px} ${py}`);
    }
  }

  return points.join(" ");
};

// Seeded random for consistent spark positions
const seededRandom = (seed: number) => {
  const x = Math.sin(seed * 12.9898 + seed * 78.233) * 43758.5453;
  return x - Math.floor(x);
};

// Wave configurations - tuned for smooth SMIL animation
const WAVE_CONFIGS = [
  { frequency: 16 / 3, amplitude: 14, duration: 1.5, opacity: 0.5 },
  { frequency: 24 / 3, amplitude: 10, duration: 1.2, opacity: 0.35 },
  { frequency: 36 / 3, amplitude: 6, duration: 1, opacity: 0.25 },
];

// Number of animation frames for SMIL path animation (more = smoother)
const WAVE_FRAMES = 20;

// Pre-compute spark data with actual x/y translations
const SPARKS = Array.from({ length: 6 }, (_, i) => {
  const angle = seededRandom(i * 3.3) * Math.PI * 2;
  const distance = 80 + seededRandom(i * 4.4) * 60;
  return {
    translateX: Math.cos(angle) * distance,
    translateY: Math.sin(angle) * distance,
    delay: seededRandom(i * 1.1) * 2,
    duration: 0.6 + seededRandom(i * 2.2) * 0.5,
  };
});

const BASE_TEXT =
  "So I've been working on this really cool flower garden project lately. I'm growing sunflowers, lavender, and these amazing dahlias that just started blooming. The colors are incredible and I can't wait to show you the photos. ";

// Repeat text many times for seamless looping
const REPEATED_TEXT = BASE_TEXT.repeat(10);

export function HeroGraphic() {
  // Compute all paths once using useMemo
  const { waves, outputCurvePath, iconX, iconY, viewBox } = useMemo(() => {
    // Use larger dimensions for SVG viewBox to zoom out
    const vw = 1000;
    const vh = 750;
    const centerX = vw;
    const centerY = vh;
    const iconX = centerX;
    const iconY = centerY;

    // Input curve: From top, swirling down, entering icon from LEFT
    const inputCurve: BezierCurve = {
      start: { x: centerX - vw * 0.1, y: -50 },
      cp1: { x: centerX + vw * 0.2, y: centerY - vh * 0.8 },
      cp2: { x: centerX - vw * 0.5, y: centerY - vh * 0.1 },
      end: { x: iconX - 28, y: iconY - 5 },
    };

    // Output curve: Exiting RIGHT, curving down and off screen
    const outputCurve: BezierCurve = {
      start: { x: iconX + 28, y: iconY + 8 },
      cp1: { x: centerX + vw * 0.4, y: centerY + vh * 0.1 },
      cp2: { x: centerX, y: centerY + vh * 0.4 },
      end: { x: centerX + vw * 0.7, y: centerY + vh * 0.5 },
    };

    // Generate wave animation frames for each wave config
    const waves = WAVE_CONFIGS.map((config) => {
      // Generate multiple frames at different time offsets for SMIL animation
      const frames: string[] = [];
      for (let i = 0; i < WAVE_FRAMES; i++) {
        // One complete cycle of the wave animation
        const timeOffset = (i / WAVE_FRAMES) * Math.PI * 2;
        frames.push(generateWavePath(inputCurve, config.frequency, config.amplitude, timeOffset));
      }
      // Add first frame again for seamless loop
      frames.push(frames[0]!);

      return {
        frames: frames.join(";"),
        opacity: config.opacity,
        duration: config.duration,
      };
    });

    // Convert output curve to SVG path string for textPath
    const outputCurvePath = `M ${outputCurve.start.x} ${outputCurve.start.y} C ${outputCurve.cp1.x} ${outputCurve.cp1.y}, ${outputCurve.cp2.x} ${outputCurve.cp2.y}, ${outputCurve.end.x} ${outputCurve.end.y}`;

    return {
      waves,
      outputCurvePath,
      iconX,
      iconY,
      viewBox: `0 0 ${vw * 2} ${vh * 2}`,
    };
  }, []);

  return (
    <div className={styles.heroGraphic}>
      <svg
        className={styles.heroSvg}
        viewBox={viewBox}
        preserveAspectRatio="xMidYMid slice"
      >
        <defs>
          {/* Output curve path for text to follow */}
          <path id="outputTextPath" d={outputCurvePath} fill="none" />
        </defs>

        {/* Animated sine waves along input curve */}
        {waves.map((wave, index) => (
          <path
            key={index}
            fill="none"
            className={styles.wavePath}
            style={{ opacity: wave.opacity }}
          >
            <animate
              attributeName="d"
              values={wave.frames}
              dur={`${wave.duration}s`}
              repeatCount="indefinite"
            />
          </path>
        ))}

        {/* Scrolling text along output curve */}
        <text className={styles.pathText}>
          <textPath href="#outputTextPath">
            {REPEATED_TEXT}
            <animate
              attributeName="startOffset"
              from="-1300"
              to="0"
              dur="15.5s"
              calcMode="linear"
              repeatCount="indefinite"
            />
          </textPath>
        </text>

        {/* Spark particles - rendered before icon so they appear behind */}
        {SPARKS.map((spark, index) => (
          <circle
            key={index}
            cx={iconX}
            cy={iconY}
            r={3}
            className={styles.spark}
          >
            <animate
              attributeName="cx"
              values={`${iconX};${iconX + spark.translateX}`}
              dur={`${spark.duration}s`}
              begin={`${spark.delay}s`}
              repeatCount="indefinite"
            />
            <animate
              attributeName="cy"
              values={`${iconY};${iconY + spark.translateY}`}
              dur={`${spark.duration}s`}
              begin={`${spark.delay}s`}
              repeatCount="indefinite"
            />
            <animate
              attributeName="opacity"
              values="0.6;0"
              dur={`${spark.duration}s`}
              begin={`${spark.delay}s`}
              repeatCount="indefinite"
            />
            <animate
              attributeName="r"
              values="3;1"
              dur={`${spark.duration}s`}
              begin={`${spark.delay}s`}
              repeatCount="indefinite"
            />
          </circle>
        ))}

        {/* Icon glow */}
        <circle
          cx={iconX}
          cy={iconY}
          r={38}
          className={styles.iconGlow}
        />

        {/* Icon circle background */}
        <circle
          cx={iconX}
          cy={iconY}
          r={30}
          className={styles.iconCircle}
        />

        {/* App logo */}
        <image
          href="/app-logo.svg"
          x={iconX - 20}
          y={iconY - 20}
          width={40}
          height={40}
          className={styles.iconLogo}
        />
      </svg>
    </div>
  );
}

export default HeroGraphic;
