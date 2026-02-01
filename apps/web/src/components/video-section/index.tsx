import { FormattedMessage } from "react-intl";
import styles from "./video-section.module.css";

export default function VideoSection() {
  return (
    <section className={styles.videoSection} id="what-is-voquill">
      <h2 className={styles.heading}>
        <FormattedMessage defaultMessage="What is Voquill?" />
      </h2>
      <div className={styles.videoWrapper}>
        <iframe
          className={styles.videoFrame}
          src="https://www.youtube.com/embed/LOiiocR1xTQ"
          title="Voquill Demo"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
        />
      </div>
    </section>
  );
}
