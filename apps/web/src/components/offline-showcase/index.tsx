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
        <div className={styles.offlineVisual}>
          <svg
            viewBox="0 0 200 200"
            className={styles.offlineIcon}
            aria-hidden="true"
          >
            <circle
              cx="100"
              cy="100"
              r="80"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              opacity="0.2"
            />
            <circle
              cx="100"
              cy="100"
              r="55"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              opacity="0.3"
            />
            <circle
              cx="100"
              cy="100"
              r="30"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              opacity="0.5"
            />
            <circle cx="100" cy="100" r="8" fill="currentColor" />
            <line
              x1="30"
              y1="170"
              x2="170"
              y2="30"
              stroke="currentColor"
              strokeWidth="4"
              strokeLinecap="round"
            />
          </svg>
        </div>
      </div>
    </section>
  );
}
