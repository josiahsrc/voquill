import DownloadButton from "./download-button.js";
import styles from "../styles/page.module.css";

export function SiteFooter() {
  return (
    <footer className={styles.footer} id="cta">
      <div className={styles.footerInner}>
        <h2>Ready to stop typing?</h2>
        <div className={styles.footerActions}>
          <DownloadButton />
        </div>
      </div>
    </footer>
  );
}

export default SiteFooter;
