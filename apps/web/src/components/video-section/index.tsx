"use client";

import { FormattedMessage, useIntl } from "react-intl";
import styles from "./video-section.module.css";

export default function VideoSection() {
  const intl = useIntl();

  return (
    <section className={styles.videoSection} id="what-is-voquill">
      <h2 className={styles.heading}>
        <FormattedMessage defaultMessage="What is Voquill?" />
      </h2>
      <div className={styles.videoWrapper}>
        <iframe
          className={styles.videoFrame}
          src="https://www.youtube.com/embed/LOiiocR1xTQ"
          title={intl.formatMessage({ defaultMessage: "Voquill Demo" })}
          loading="lazy"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
        />
      </div>
    </section>
  );
}
