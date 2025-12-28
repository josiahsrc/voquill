import styles from "./privacy-lock.module.css";

type PrivacyLockProps = {
  className?: string;
};

export default function PrivacyLock({ className }: PrivacyLockProps) {
  const wrapperClass = className
    ? `${styles.wrapper} ${className}`
    : styles.wrapper;

  return (
    <div className={wrapperClass} aria-hidden="true">
      <div className={styles.halo} />
      <div className={styles.lockContainer}>
        <svg viewBox="0 0 120 150" className={styles.lockSvg} fill="none">
          <defs>
            {/* Shackle gradient - metallic bevel */}
            <linearGradient
              id="shackleGradient"
              x1="0%"
              y1="0%"
              x2="100%"
              y2="0%"
            >
              <stop offset="0%" className={styles.shackleLight} />
              <stop offset="35%" className={styles.shackleMid} />
              <stop offset="50%" className={styles.shackleDark} />
              <stop offset="65%" className={styles.shackleMid} />
              <stop offset="100%" className={styles.shackleLight} />
            </linearGradient>

            {/* Body gradient - 3D bevel effect */}
            <linearGradient
              id="bodyGradient"
              x1="0%"
              y1="0%"
              x2="100%"
              y2="100%"
            >
              <stop offset="0%" className={styles.bodyLight} />
              <stop offset="30%" className={styles.bodyMid} />
              <stop offset="100%" className={styles.bodyDark} />
            </linearGradient>

            {/* Body highlight */}
            <linearGradient
              id="bodyHighlight"
              x1="0%"
              y1="0%"
              x2="0%"
              y2="100%"
            >
              <stop offset="0%" stopColor="white" stopOpacity="0.25" />
              <stop offset="50%" stopColor="white" stopOpacity="0" />
            </linearGradient>

            {/* Keyhole gradient */}
            <linearGradient
              id="keyholeGradient"
              x1="0%"
              y1="0%"
              x2="0%"
              y2="100%"
            >
              <stop offset="0%" className={styles.keyholeLight} />
              <stop offset="100%" className={styles.keyholeDark} />
            </linearGradient>

            {/* Inner shadow for keyhole */}
            <radialGradient id="keyholeShadow" cx="50%" cy="0%" r="100%">
              <stop offset="0%" stopColor="black" stopOpacity="0.3" />
              <stop offset="100%" stopColor="black" stopOpacity="0" />
            </radialGradient>
          </defs>

          {/* Shackle shadow */}
          <path
            d="M25 65 L25 45 C25 22 42 8 60 8 C78 8 95 22 95 45 L95 65"
            stroke="black"
            strokeOpacity="0.15"
            strokeWidth="14"
            strokeLinecap="round"
            fill="none"
            transform="translate(2, 3)"
          />

          {/* Shackle */}
          <path
            d="M25 65 L25 45 C25 22 42 8 60 8 C78 8 95 22 95 45 L95 65"
            stroke="url(#shackleGradient)"
            strokeWidth="12"
            strokeLinecap="round"
            fill="none"
          />

          {/* Shackle inner highlight */}
          <path
            d="M31 62 L31 45 C31 26 45 14 60 14 C75 14 89 26 89 45 L89 62"
            stroke="white"
            strokeOpacity="0.2"
            strokeWidth="2"
            strokeLinecap="round"
            fill="none"
          />

          {/* Body shadow */}
          <rect
            x="14"
            y="61"
            width="96"
            height="80"
            rx="12"
            fill="black"
            fillOpacity="0.15"
          />

          {/* Lock body */}
          <rect
            x="12"
            y="58"
            width="96"
            height="80"
            rx="12"
            fill="url(#bodyGradient)"
          />

          {/* Body top highlight */}
          <rect
            x="12"
            y="58"
            width="96"
            height="40"
            rx="12"
            fill="url(#bodyHighlight)"
          />

          {/* Body edge highlight */}
          <path
            d="M24 58 L96 58 C103 58 108 63 108 70 L108 126 C108 133 103 138 96 138 L24 138 C17 138 12 133 12 126 L12 70 C12 63 17 58 24 58"
            stroke="white"
            strokeOpacity="0.15"
            strokeWidth="1"
            fill="none"
          />

          {/* Keyhole recess/shadow */}
          <ellipse
            cx="61"
            cy="94"
            rx="14"
            ry="14"
            fill="black"
            fillOpacity="0.25"
          />
          <path
            d="M53 94 L53 119 C53 123 56 126 60 126 C64 126 67 123 67 119 L67 94"
            fill="black"
            fillOpacity="0.25"
          />

          {/* Keyhole - single unified shape */}
          <path
            d="M60 79
               C52.3 79 46 85.3 46 93
               C46 98.5 49.5 103.2 54.5 105.2
               L54.5 118
               C54.5 121 57 124 60 124
               C63 124 65.5 121 65.5 118
               L65.5 105.2
               C70.5 103.2 74 98.5 74 93
               C74 85.3 67.7 79 60 79 Z"
            fill="url(#keyholeGradient)"
          />

          {/* Keyhole inner shadow */}
          <path
            d="M60 79
               C52.3 79 46 85.3 46 93
               C46 98.5 49.5 103.2 54.5 105.2
               L54.5 118
               C54.5 121 57 124 60 124
               C63 124 65.5 121 65.5 118
               L65.5 105.2
               C70.5 103.2 74 98.5 74 93
               C74 85.3 67.7 79 60 79 Z"
            fill="url(#keyholeShadow)"
          />
        </svg>
      </div>
      <span className={styles.srOnly}>
        Animated lock icon representing privacy and security.
      </span>
    </div>
  );
}
