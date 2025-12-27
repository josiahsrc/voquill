import { useEffect, useRef } from "react";
import styles from "./hero.module.css";
import { reverseString } from "../../utils/string.utils";

// Simple cubic Bezier curve definition
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

  // Tangent
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

// Build arc-length lookup table for uniform spacing along curve
const buildArcLengthTable = (curve: BezierCurve, samples: number = 200) => {
  const table: { t: number; length: number }[] = [{ t: 0, length: 0 }];
  let totalLength = 0;
  let prevPoint = bezierPoint(curve, 0);

  for (let i = 1; i <= samples; i++) {
    const t = i / samples;
    const point = bezierPoint(curve, t);
    const dx = point.x - prevPoint.x;
    const dy = point.y - prevPoint.y;
    totalLength += Math.sqrt(dx * dx + dy * dy);
    table.push({ t, length: totalLength });
    prevPoint = point;
  }

  return { table, totalLength };
};

// Get t value for a given arc-length distance
const getTAtLength = (
  table: { t: number; length: number }[],
  targetLength: number,
) => {
  const lastEntry = table[table.length - 1];
  if (targetLength <= 0 || !lastEntry) return 0;
  if (targetLength >= lastEntry.length) return 1;

  // Binary search
  let low = 0;
  let high = table.length - 1;
  while (low < high - 1) {
    const mid = Math.floor((low + high) / 2);
    const midEntry = table[mid];
    if (midEntry && midEntry.length < targetLength) {
      low = mid;
    } else {
      high = mid;
    }
  }

  // Linear interpolation
  const lowEntry = table[low];
  const highEntry = table[high];
  if (!lowEntry || !highEntry) return 0;
  const l0 = lowEntry.length;
  const l1 = highEntry.length;
  const t0 = lowEntry.t;
  const t1 = highEntry.t;
  const ratio = (targetLength - l0) / (l1 - l0);
  return t0 + ratio * (t1 - t0);
};

// Seeded random for consistent but random-looking values
const seededRandom = (seed: number) => {
  const x = Math.sin(seed * 12.9898 + seed * 78.233) * 43758.5453;
  return x - Math.floor(x);
};

// Wave configurations (static)
const WAVE_CONFIGS = [
  { frequency: 16 / 3, amplitude: 14, speed: 6, opacity: 0.5 },
  { frequency: 24 / 3, amplitude: 10, speed: 10, opacity: 0.35 },
  { frequency: 36 / 3, amplitude: 6, speed: 32, opacity: 0.25 },
];

const WAVE_SEGMENTS = 100; // Reduced from 200
const NUM_SPARKS = 6;
const LETTER_PIXEL_SPACING = 10;
const BASE_PARAGRAPH = reverseString(
  "So I've been working on this really cool flower garden project lately. I'm growing sunflowers, lavender, and these amazing dahlias that just started blooming. The colors are incredible and I can't wait to show you the photos. ",
);

export function HeroGraphic() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>(0);
  const logoRef = useRef<HTMLImageElement | null>(null);
  const isVisibleRef = useRef(true);
  const cacheRef = useRef<{
    inputCurve: BezierCurve;
    outputCurve: BezierCurve;
    iconX: number;
    iconY: number;
    w: number;
    h: number;
    arcTable: { t: number; length: number }[];
    totalLength: number;
  } | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d", { alpha: true });
    if (!ctx) return;

    // Load the logo SVG as an image
    const logo = new Image();
    logo.src = "/app-logo.svg";
    logoRef.current = logo;

    // Get curves - simple cubic Bezier curves
    const computeCurves = () => {
      const vw = window.innerWidth;
      const vh = window.innerHeight;

      const centerX = vw;
      const centerY = vh;

      const iconX = centerX;
      const iconY = centerY;

      // Input curve: From top, swirling down, entering icon from LEFT
      const inputCurve: BezierCurve = {
        start: { x: centerX - vw * 0.1, y: -50 },
        cp1: { x: centerX + vw * 0.2, y: centerY - vh * 0.8 },
        cp2: { x: centerX - vw * 0.5, y: centerY - vh * 0.1 },
        end: { x: iconX - 40, y: iconY },
      };

      // Output curve: Exiting RIGHT, curving down and off screen
      const outputCurve: BezierCurve = {
        start: { x: iconX + 40, y: iconY + 10 },
        cp1: { x: centerX + vw * 0.4, y: centerY + vh * 0.1 },
        cp2: { x: centerX, y: centerY + vh * 0.4 },
        end: { x: centerX + vw * 0.7, y: centerY + vh * 0.5 },
      };

      // Pre-compute arc-length table for output curve
      const { table, totalLength } = buildArcLengthTable(outputCurve);

      cacheRef.current = {
        inputCurve,
        outputCurve,
        iconX,
        iconY,
        w: vw * 2,
        h: vh * 2,
        arcTable: table,
        totalLength,
      };
    };

    // Set canvas size - use 1x size, not 2x
    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio, 2); // Cap DPR at 2
      const w = window.innerWidth * 2;
      const h = window.innerHeight * 2;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.scale(dpr, dpr);

      // Recompute curves on resize
      computeCurves();
    };

    resize();
    window.addEventListener("resize", resize);

    // Intersection Observer to pause animation when not visible
    const observer = new IntersectionObserver(
      (entries) => {
        isVisibleRef.current = entries[0]?.isIntersecting ?? false;
      },
      { threshold: 0 },
    );
    observer.observe(canvas);

    let time = 25; // Start midway so text is already visible on curve
    let lastFrameTime = performance.now();

    const draw = (currentTime: number) => {
      // Skip if not visible
      if (!isVisibleRef.current) {
        animationRef.current = requestAnimationFrame(draw);
        return;
      }

      // Frame rate limiting - target ~30fps for smoother performance
      const elapsed = currentTime - lastFrameTime;
      if (elapsed < 32) {
        // ~30fps
        animationRef.current = requestAnimationFrame(draw);
        return;
      }
      lastFrameTime = currentTime;

      const cache = cacheRef.current;
      if (!cache) {
        animationRef.current = requestAnimationFrame(draw);
        return;
      }

      const { inputCurve, outputCurve, iconX, iconY, w, h, arcTable, totalLength } = cache;

      // Clear canvas
      ctx.clearRect(0, 0, w, h);

      // Get computed styles for dark mode support
      const isDarkMode = window.matchMedia(
        "(prefers-color-scheme: dark)",
      ).matches;

      // Draw three continuous sine waves along the entire input curve
      for (const wave of WAVE_CONFIGS) {
        ctx.beginPath();

        for (let i = 0; i <= WAVE_SEGMENTS; i++) {
          const t = i / WAVE_SEGMENTS;
          const { x, y, angle } = bezierPoint(inputCurve, t);

          // Perpendicular direction to the curve
          const perpX = -Math.sin(angle);
          const perpY = Math.cos(angle);

          // Sine wave: frequency determines oscillations, time creates movement
          const phase = t * wave.frequency * Math.PI * 2 - time * wave.speed;
          const sineValue = Math.sin(phase) * wave.amplitude;

          // Fade in at start and fade out at end for smooth entry/exit
          const fadeIn = Math.min(1, t * 5);
          const fadeOut = Math.min(1, (1 - t) * 5);
          const fade = fadeIn * fadeOut;

          const px = x + perpX * sineValue * fade;
          const py = y + perpY * sineValue * fade;

          if (i === 0) {
            ctx.moveTo(px, py);
          } else {
            ctx.lineTo(px, py);
          }
        }

        ctx.strokeStyle = isDarkMode
          ? `rgba(255, 255, 255, ${wave.opacity})`
          : `rgba(0, 0, 0, ${wave.opacity})`;
        ctx.lineWidth = 3;
        ctx.lineCap = "round";
        ctx.lineJoin = "round";
        ctx.stroke();
      }

      // Draw letters traveling along output curve with uniform spacing
      ctx.font = "500 18px system-ui, -apple-system, sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";

      const textColor = isDarkMode
        ? "rgba(255, 255, 255, 0.7)"
        : "rgba(0, 0, 0, 0.7)";

      // Scroll offset grows continuously (no modulo) for seamless looping
      const scrollOffset = time * 280;

      // Calculate which letter indices are currently visible on the curve
      const minIndex = Math.max(
        0,
        Math.floor((scrollOffset - totalLength) / LETTER_PIXEL_SPACING),
      );
      const maxIndex = Math.floor(scrollOffset / LETTER_PIXEL_SPACING);

      ctx.fillStyle = textColor;

      for (let i = minIndex; i <= maxIndex; i++) {
        const curvePosition = scrollOffset - i * LETTER_PIXEL_SPACING;

        if (curvePosition >= 0 && curvePosition <= totalLength) {
          // Wrap index to get repeating text
          const letterIndex = i % BASE_PARAGRAPH.length;
          const letter = BASE_PARAGRAPH[letterIndex];

          const t = getTAtLength(arcTable, curvePosition);
          const { x, y, angle } = bezierPoint(outputCurve, t);

          ctx.save();
          ctx.translate(x, y);
          ctx.rotate(angle);
          ctx.fillText(letter ?? "", 0, 0);
          ctx.restore();
        }
      }

      // Draw sparks flying out of the icon randomly
      for (let i = 0; i < NUM_SPARKS; i++) {
        // Random timing offset for each spark
        const timeOffset = seededRandom(i * 1.1) * 3;
        const duration = 0.8 + seededRandom(i * 2.2) * 0.7;
        const sparkPhase = (time * 2 + timeOffset) % duration;
        const t = sparkPhase / duration; // 0 to 1 normalized time

        // Random launch angle
        const launchAngle = seededRandom(i * 3.3) * Math.PI * 2;
        // Random speed
        const speed = 150 + seededRandom(i * 4.4) * 100;

        // Straight line outward from icon center
        const sparkX = iconX + Math.cos(launchAngle) * speed * t;
        const sparkY = iconY + Math.sin(launchAngle) * speed * t;

        // Fade out over time
        const sparkAlpha = Math.max(0, (1 - t) * 0.6);

        // Size starts big and shrinks as it flies
        const sparkSize = Math.max(0.5, 3 * (1 - t));

        if (sparkAlpha > 0.05) {
          ctx.beginPath();
          ctx.arc(sparkX, sparkY, sparkSize, 0, Math.PI * 2);
          ctx.fillStyle = isDarkMode
            ? `rgba(255, 255, 255, ${sparkAlpha})`
            : `rgba(0, 0, 0, ${sparkAlpha})`;
          ctx.fill();
        }
      }

      // Icon glow/background
      const iconSize = 80;
      ctx.beginPath();
      ctx.arc(iconX, iconY, iconSize / 2 + 8, 0, Math.PI * 2);
      ctx.fillStyle = isDarkMode
        ? "rgba(255, 255, 255, 0.08)"
        : "rgba(0, 0, 0, 0.04)";
      ctx.fill();

      // Icon circle background
      ctx.beginPath();
      ctx.arc(iconX, iconY, iconSize / 2, 0, Math.PI * 2);
      ctx.fillStyle = isDarkMode ? "#ffffff" : "#111111";
      ctx.fill();

      // Draw the app logo
      const logoImg = logoRef.current;
      if (logoImg && logoImg.complete) {
        ctx.save();

        // Logo is black by default (stroke="currentColor")
        // Light mode: black circle bg -> need white logo -> invert
        // Dark mode: white circle bg -> need black logo -> no invert
        if (!isDarkMode) {
          ctx.filter = "invert(1)";
        }

        const logoSize = iconSize * 0.65;
        ctx.drawImage(
          logoImg,
          iconX - logoSize / 2,
          iconY - logoSize / 2,
          logoSize,
          logoSize,
        );

        ctx.restore();
      }

      time += 0.01; // Adjusted for ~30fps
      animationRef.current = requestAnimationFrame(draw);
    };

    animationRef.current = requestAnimationFrame(draw);

    return () => {
      window.removeEventListener("resize", resize);
      observer.disconnect();
      cancelAnimationFrame(animationRef.current);
    };
  }, []);

  return (
    <div className={styles.heroGraphic}>
      <canvas ref={canvasRef} className={styles.heroCanvas} />
    </div>
  );
}

export default HeroGraphic;
