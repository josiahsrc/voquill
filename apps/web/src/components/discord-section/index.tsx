import { useEffect, useState } from "react";
import { FormattedMessage } from "react-intl";
import DiscordIcon from "../../assets/discord.svg?react";
import pageStyles from "../../styles/page.module.css";
import styles from "./discord-section.module.css";

const DISCORD_INVITE_CODE = "5jXkDvdVdt";
const TEN_MINUTES_MS = 10 * 60 * 1000;

const useDiscordOnlineCount = () => {
  const [onlineCount, setOnlineCount] = useState<number | null>(null);

  useEffect(() => {
    const fetchCount = async () => {
      try {
        const response = await fetch(
          `https://discord.com/api/v9/invites/${DISCORD_INVITE_CODE}?with_counts=true`
        );
        if (response.ok) {
          const data = await response.json();
          setOnlineCount(data.approximate_presence_count);
        }
      } catch {
        // Silently fail - just don't show the count
      }
    };

    fetchCount();
    const interval = setInterval(fetchCount, TEN_MINUTES_MS);
    return () => clearInterval(interval);
  }, []);

  return onlineCount;
};

export default function DiscordSection() {
  const onlineCount = useDiscordOnlineCount();

  return (
    <section className={styles.section} id="community">
      <DiscordIcon className={styles.backgroundIcon} />
      <div className={styles.content}>
        <div className={styles.badges}>
          <span className={`${pageStyles.badge} ${styles.newBadge}`}>
            <FormattedMessage defaultMessage="New!" />
          </span>
          {onlineCount !== null && (
            <span className={`${pageStyles.badge} ${styles.onlineBadge}`}>
              <span className={styles.pingWrapper}>
                <span className={styles.ping} />
                <span className={styles.pingDot} />
              </span>
              <FormattedMessage
                defaultMessage="{count} Online"
                values={{ count: onlineCount.toLocaleString() }}
              />
            </span>
          )}
        </div>
        <h2 className={styles.heading}>
          <FormattedMessage defaultMessage="Join the conversation" />
        </h2>
        <p className={styles.description}>
          <FormattedMessage defaultMessage="Voquill is built in the open. Join our Discord to share feedback, request features, report bugs, or just hang out with other people. We're building this together." />
        </p>
        <a
          href={`https://discord.gg/${DISCORD_INVITE_CODE}`}
          target="_blank"
          rel="noopener noreferrer"
          className={styles.discordButton}
        >
          <DiscordIcon className={styles.discordButtonIcon} />
          <FormattedMessage defaultMessage="Join Discord" />
        </a>
      </div>
    </section>
  );
}
