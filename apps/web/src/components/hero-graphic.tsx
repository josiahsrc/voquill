import { FormattedMessage } from "react-intl";
import styles from "../styles/page.module.css";

export function HeroGraphic() {
  return (
    <div className={styles.heroGraphic}>
      <div className={styles.placeholderGraphic}>
        <div className={styles.placeholderWaveform}>
          <span className={styles.placeholderBar} />
          <span className={styles.placeholderBar} />
          <span className={styles.placeholderBar} />
          <span className={styles.placeholderBar} />
          <span className={styles.placeholderBar} />
          <span className={styles.placeholderBar} />
          <span className={styles.placeholderBar} />
        </div>
        <span className={styles.placeholderLabel}>
          <FormattedMessage defaultMessage="Voice to Text" />
        </span>
      </div>

      <div className={`${styles.floatingCard} ${styles.cardLeft}`}>
        <div className={`${styles.floatingCardIcon} ${styles.iconSuccess}`}>
          <svg
            className={styles.floatingCardIconSvg}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M5 13l4 4L19 7"
            />
          </svg>
        </div>
        <div className={styles.floatingCardText}>
          <span className={styles.floatingCardTitle}>
            <FormattedMessage defaultMessage="4x Faster" />
          </span>
          <span className={styles.floatingCardSubtitle}>
            <FormattedMessage defaultMessage="Than typing" />
          </span>
        </div>
      </div>

      <div className={`${styles.floatingCard} ${styles.cardRight}`}>
        <div className={`${styles.floatingCardIcon} ${styles.iconSpeed}`}>
          <svg
            className={styles.floatingCardIconSvg}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M13 10V3L4 14h7v7l9-11h-7z"
            />
          </svg>
        </div>
        <div className={styles.floatingCardText}>
          <span className={styles.floatingCardTitle}>
            <FormattedMessage defaultMessage="AI Cleanup" />
          </span>
          <span className={styles.floatingCardSubtitle}>
            <FormattedMessage defaultMessage="Remove filler words" />
          </span>
        </div>
      </div>
    </div>
  );
}

export default HeroGraphic;
