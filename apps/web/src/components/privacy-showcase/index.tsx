import { FormattedMessage } from "react-intl";
import PrivacyLock from "../privacy-lock";
import styles from "../../styles/page.module.css";

export default function PrivacyShowcase() {
  return (
    <section className={styles.splitSection} id="privacy">
      <div className={styles.splitContent}>
        <span className={styles.badge}>
          <FormattedMessage defaultMessage="Private and secure" />
        </span>
        <h2>
          <FormattedMessage defaultMessage="Your data is yours. Period." />
        </h2>
        <p>
          <FormattedMessage defaultMessage="Process everything locally on your device, bring your own API key, or connect to our cloud. Don't believe us? See for yourself. Voquill is fully open-source." />
        </p>
        <a
          href="https://github.com/josiahsrc/voquill"
          target="_blank"
          rel="noopener noreferrer"
          className={styles.inlineLink}
        >
          <FormattedMessage defaultMessage="GitHub Source Code →" />
        </a>
      </div>
      <div className={`${styles.splitMedia} ${styles.privacyMedia}`}>
        <PrivacyLock />
      </div>
    </section>
  );
}
