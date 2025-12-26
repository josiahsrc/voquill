import { Link } from "react-router-dom";
import { FormattedMessage, useIntl } from "react-intl";
import DownloadButton from "../download-button";
import {
  PLATFORM_CONFIG,
  PLATFORM_ORDER,
  type Platform,
} from "../../lib/downloads";
import styles from "./hero.module.css";
import { HeroGraphic } from "./hero-graphic";

export function HeroSection() {
  const intl = useIntl();

  return (
    <section className={styles.heroSection} id="overview">
      <div className={styles.heroContent}>
        <h1 className={styles.heroTitle}>
          <FormattedMessage defaultMessage="Your keyboard is holding you back." />
        </h1>
        <p className={styles.heroSubtitle}>
          <FormattedMessage defaultMessage="Make voice your new keyboard. Type four times faster by using your voice." />
        </p>
        <div className={styles.heroActions}>
          <DownloadButton />
        </div>
        <div className={styles.heroMeta}>
          <p className={styles.heroNote}>
            <FormattedMessage defaultMessage="No credit card required, get started for free." />
          </p>
          <div
            className={styles.heroPlatformList}
            aria-label={intl.formatMessage({
              defaultMessage: "Desktop downloads",
            })}
          >
            {PLATFORM_ORDER.map((platformId: Platform) => {
              const { Icon, name, id } = PLATFORM_CONFIG[platformId];
              return (
                <span
                  key={id}
                  className={styles.heroPlatformBadge}
                  role="img"
                  aria-label={name}
                  title={name}
                >
                  <Icon className={styles.heroPlatformIcon} size={24} />
                </span>
              );
            })}
          </div>
          <Link to="/download" className={styles.heroMoreLink}>
            <FormattedMessage defaultMessage="More download options" />
          </Link>
        </div>
      </div>
      <HeroGraphic />
    </section>
  );
}

export default HeroSection;
