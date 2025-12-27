import { useEffect, useRef } from "react";
import styles from "./hero.module.css";
import { reverseString } from "../../utils/string.utils";

export function HeroGraphic() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>(0);
  const logoRef = useRef<HTMLImageElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Load the logo SVG as an image
    const logo = new Image();
    logo.src = "/app-logo.svg";
    logoRef.current = logo;

    // Set canvas size
    const resize = () => {
      const w = window.innerWidth * 2;
      const h = window.innerHeight * 2;
      canvas.width = w * window.devicePixelRatio;
      canvas.height = h * window.devicePixelRatio;
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
    };

    resize();
    window.addEventListener("resize", resize);

    // Simple cubic Bezier curve definition
    type BezierCurve = {
      start: { x: number; y: number };
      cp1: { x: number; y: number };
      cp2: { x: number; y: number };
      end: { x: number; y: number };
    };

    // Get curves - simple cubic Bezier curves (perfectly smooth)
    const getCurves = () => {
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

      return { inputCurve, outputCurve, iconX, iconY, w: vw * 2, h: vh * 2 };
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
    const buildArcLengthTable = (curve: BezierCurve, samples: number = 500) => {
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

    let time = 25; // Start midway so text is already visible on curve

    const draw = () => {
      const { inputCurve, outputCurve, iconX, iconY, w, h } = getCurves();

      // Clear canvas
      ctx.clearRect(0, 0, w, h);

      // Get computed styles for dark mode support
      const isDarkMode = window.matchMedia(
        "(prefers-color-scheme: dark)",
      ).matches;
      const strokeColor = isDarkMode
        ? "rgba(255, 255, 255, 0.15)"
        : "rgba(0, 0, 0, 0.08)";

      // Set up stroke style for waves
      ctx.strokeStyle = strokeColor;
      ctx.lineWidth = 1.5;
      ctx.lineCap = "round";

      // Draw three continuous sine waves along the entire input curve
      // Each wave has a different frequency and they animate over time
      const waveConfigs = [
        { frequency: 16 / 3, amplitude: 14, speed: 6, opacity: 0.5 },
        { frequency: 24 / 3, amplitude: 10, speed: 10, opacity: 0.35 },
        { frequency: 36 / 3, amplitude: 6, speed: 32, opacity: 0.25 },
      ];

      const segments = 200; // High segment count for smooth curves

      for (const wave of waveConfigs) {
        ctx.beginPath();

        for (let i = 0; i <= segments; i++) {
          const t = i / segments;
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
      const baseParagraph = reverseString(
        "So I've been working on this really cool flower garden project lately. I'm growing sunflowers, lavender, and these amazing dahlias that just started blooming. The colors are incredible and I can't wait to show you the photos. ",
      );
      const letterPixelSpacing = 10; // Fixed pixel spacing between letters

      // Build arc-length table for output curve
      const { table, totalLength } = buildArcLengthTable(outputCurve);

      ctx.font = "500 18px system-ui, -apple-system, sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";

      const textColor = isDarkMode
        ? "rgba(255, 255, 255, 0.7)"
        : "rgba(0, 0, 0, 0.7)";

      // Scroll offset grows continuously (no modulo) for seamless looping
      const scrollOffset = time * 280;

      // Calculate which letter indices are currently visible on the curve
      // Letter i is at curve position: scrollOffset - i * letterPixelSpacing
      // Visible when position is in [0, totalLength]
      const minIndex = Math.max(
        0,
        Math.floor((scrollOffset - totalLength) / letterPixelSpacing),
      );
      const maxIndex = Math.floor(scrollOffset / letterPixelSpacing);

      for (let i = minIndex; i <= maxIndex; i++) {
        const curvePosition = scrollOffset - i * letterPixelSpacing;

        if (curvePosition >= 0 && curvePosition <= totalLength) {
          // Wrap index to get repeating text
          const letterIndex = i % baseParagraph.length;
          const letter = baseParagraph[letterIndex];

          const t = getTAtLength(table, curvePosition);
          const { x, y, angle } = bezierPoint(outputCurve, t);

          ctx.save();
          ctx.translate(x, y);
          ctx.rotate(angle);

          ctx.fillStyle = textColor;
          ctx.fillText(letter ?? "", 0, 0);

          ctx.restore();
        }
      }

      // Draw Voquill icon at the meeting point
      const iconSize = 80;

      // Draw sparks flying out of the icon randomly
      const numSparks = 6;
      // Use seeded random for consistent but random-looking sparks
      const seededRandom = (seed: number) => {
        const x = Math.sin(seed * 12.9898 + seed * 78.233) * 43758.5453;
        return x - Math.floor(x);
      };

      for (let i = 0; i < numSparks; i++) {
        // Random timing offset for each spark
        const timeOffset = seededRandom(i * 1.1) * 3;
        const duration = 0.8 + seededRandom(i * 2.2) * 0.7;
        const sparkPhase = (time * 2 + timeOffset) % duration;
        const t = sparkPhase / duration; // 0 to 1 normalized time

        // Random launch angle
        const launchAngle = seededRandom(i * 3.3) * Math.PI * 2;
        // Random speed
        const speed = 150 + seededRandom(i * 4.4) * 100;

        // Start from inside the icon
        const startX = iconX;
        const startY = iconY;

        // Straight line outward
        const sparkX = startX + Math.cos(launchAngle) * speed * t;
        const sparkY = startY + Math.sin(launchAngle) * speed * t;

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
      const logo = logoRef.current;
      if (logo && logo.complete) {
        ctx.save();

        // Logo is black by default (stroke="currentColor")
        // Light mode: black circle bg → need white logo → invert
        // Dark mode: white circle bg → need black logo → no invert
        if (!isDarkMode) {
          ctx.filter = "invert(1)";
        }

        const logoSize = iconSize * 0.65;
        ctx.drawImage(
          logo,
          iconX - logoSize / 2,
          iconY - logoSize / 2,
          logoSize,
          logoSize,
        );

        ctx.restore();
      }

      time += 0.006;
      animationRef.current = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      window.removeEventListener("resize", resize);
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
