import { FormattedMessage } from "react-intl";
import pageStyles from "../../styles/page.module.css";
import styles from "./offline-showcase.module.css";

export default function OfflineShowcase() {
  return (
    <section className={pageStyles.splitSection} id="offline">
      <div className={pageStyles.splitContent}>
        <span className={pageStyles.badge}>
          <FormattedMessage defaultMessage="Works offline" />
        </span>
        <h2>
          <FormattedMessage defaultMessage="No internet? No problem." />
        </h2>
        <p>
          <FormattedMessage defaultMessage="Other dictation tools send your audio straight to the cloud. Voquill can run entirely on your device — your words never leave your machine. Airplane mode, off the grid, wherever. It just works." />
        </p>
      </div>
      <div className={`${pageStyles.splitMedia} ${styles.offlineMedia}`}>
        <div className={styles.wrapper}>
          <div className={styles.iconContainer}>
            <svg
              viewBox="0 0 160 160"
              className={styles.wifiSvg}
              fill="none"
            >
              <defs>
                {/* Arc gradient - metallic bevel */}
                <linearGradient id="arcGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" className={styles.arcLight} />
                  <stop offset="50%" className={styles.arcMid} />
                  <stop offset="100%" className={styles.arcDark} />
                </linearGradient>

                {/* Dot gradient - 3D effect */}
                <radialGradient id="dotGradient" cx="30%" cy="30%" r="70%">
                  <stop offset="0%" className={styles.dotLight} />
                  <stop offset="100%" className={styles.dotDark} />
                </radialGradient>

                {/* Highlight for arcs */}
                <linearGradient id="arcHighlight" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="white" stopOpacity="0.3" />
                  <stop offset="100%" stopColor="white" stopOpacity="0" />
                </linearGradient>
              </defs>

              {/* Outer arc shadow */}
              <path
                d="M25 85 A75 75 0 0 1 135 85"
                stroke="black"
                strokeOpacity="0.12"
                strokeWidth="14"
                strokeLinecap="round"
                fill="none"
                transform="translate(2, 3)"
              />
              {/* Outer arc */}
              <path
                d="M25 85 A75 75 0 0 1 135 85"
                stroke="url(#arcGradient)"
                strokeWidth="12"
                strokeLinecap="round"
                fill="none"
              />
              {/* Outer arc highlight */}
              <path
                d="M29 82 A71 71 0 0 1 131 82"
                stroke="white"
                strokeOpacity="0.2"
                strokeWidth="2"
                strokeLinecap="round"
                fill="none"
              />

              {/* Middle arc shadow */}
              <path
                d="M45 100 A50 50 0 0 1 115 100"
                stroke="black"
                strokeOpacity="0.12"
                strokeWidth="14"
                strokeLinecap="round"
                fill="none"
                transform="translate(2, 3)"
              />
              {/* Middle arc */}
              <path
                d="M45 100 A50 50 0 0 1 115 100"
                stroke="url(#arcGradient)"
                strokeWidth="12"
                strokeLinecap="round"
                fill="none"
              />
              {/* Middle arc highlight */}
              <path
                d="M49 97 A46 46 0 0 1 111 97"
                stroke="white"
                strokeOpacity="0.2"
                strokeWidth="2"
                strokeLinecap="round"
                fill="none"
              />

              {/* Inner arc shadow */}
              <path
                d="M60 115 A28 28 0 0 1 100 115"
                stroke="black"
                strokeOpacity="0.12"
                strokeWidth="14"
                strokeLinecap="round"
                fill="none"
                transform="translate(2, 3)"
              />
              {/* Inner arc */}
              <path
                d="M60 115 A28 28 0 0 1 100 115"
                stroke="url(#arcGradient)"
                strokeWidth="12"
                strokeLinecap="round"
                fill="none"
              />
              {/* Inner arc highlight */}
              <path
                d="M64 112 A24 24 0 0 1 96 112"
                stroke="white"
                strokeOpacity="0.2"
                strokeWidth="2"
                strokeLinecap="round"
                fill="none"
              />

              {/* Center dot shadow */}
              <circle
                cx="82"
                cy="138"
                r="10"
                fill="black"
                fillOpacity="0.15"
              />
              {/* Center dot */}
              <circle
                cx="80"
                cy="136"
                r="10"
                fill="url(#dotGradient)"
              />
              {/* Dot highlight */}
              <circle
                cx="77"
                cy="133"
                r="3"
                fill="white"
                fillOpacity="0.3"
              />

              {/* Strike-through background knockout */}
              <line
                x1="22"
                y1="145"
                x2="138"
                y2="22"
                className={styles.strikeKnockout}
                strokeWidth="20"
                strokeLinecap="round"
              />
              {/* Strike-through shadow */}
              <line
                x1="22"
                y1="145"
                x2="138"
                y2="22"
                stroke="black"
                strokeOpacity="0.12"
                strokeWidth="14"
                strokeLinecap="round"
                transform="translate(2, 2)"
              />
              {/* Strike-through line */}
              <line
                x1="22"
                y1="145"
                x2="138"
                y2="22"
                stroke="url(#arcGradient)"
                strokeWidth="12"
                strokeLinecap="round"
              />
              {/* Strike highlight */}
              <line
                x1="26"
                y1="141"
                x2="134"
                y2="26"
                stroke="white"
                strokeOpacity="0.2"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
          </div>
          <span className={styles.srOnly}>
            Offline icon representing local-first functionality.
          </span>
        </div>
      </div>
    </section>
  );
}
