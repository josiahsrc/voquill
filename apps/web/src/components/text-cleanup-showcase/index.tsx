import { FormattedMessage } from "react-intl";
import DownloadButton from "../download-button";
import TextCleanupAnimation from "./text-cleanup-animation";
import styles from "../../styles/page.module.css";

export default function TextCleanupShowcase() {
  return (
    <section className={styles.splitSection} id="demo">
      <div className={styles.splitMedia}>
        <TextCleanupAnimation />
      </div>
      <div className={styles.splitContent}>
        <span className={styles.badge}>
          <FormattedMessage defaultMessage="Smart text cleanup" />
        </span>
        <h2>
          <FormattedMessage defaultMessage="Auto-correct with AI" />
        </h2>
        <p>
          <FormattedMessage defaultMessage="Voquill uses AI to clean up your transcripts. It removes filler words, hesitations, false starts, etc. Speak naturally, Voquill will handle the rest." />
        </p>
        <DownloadButton className={styles.inlineButton} />
      </div>
    </section>
  );
}
