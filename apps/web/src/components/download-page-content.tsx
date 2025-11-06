import { useEffect, useMemo, useState } from "react";
import DownloadButton from "./download-button";
import styles from "../styles/page.module.css";
import {
  DEFAULT_PLATFORM,
  detectPlatform,
  extractDownloads,
  fetchReleaseManifest,
  getPlatformDisplayName,
  PLATFORM_CONFIG,
  PLATFORM_ORDER,
  type Platform,
  type PlatformDownload,
  type ReleaseManifest,
} from "../lib/downloads";

const OPTIONS_SECTION_ID = "download-options";

export function DownloadPageContent() {
  const [platform, setPlatform] = useState<Platform>(DEFAULT_PLATFORM);
  const [manifest, setManifest] = useState<ReleaseManifest | undefined>();
  const [downloads, setDownloads] = useState<PlatformDownload[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setPlatform(detectPlatform());
  }, []);

  useEffect(() => {
    let isMounted = true;
    const abortController = new AbortController();

    async function loadManifest() {
      setIsLoading(true);
      const data = await fetchReleaseManifest(abortController.signal);

      if (!isMounted) {
        return;
      }

      if (data) {
        setManifest(data);
        setDownloads(extractDownloads(data));
      } else {
        setManifest(undefined);
        setDownloads([]);
      }

      setIsLoading(false);
    }

    void loadManifest();

    return () => {
      isMounted = false;
      abortController.abort();
    };
  }, []);

  const downloadsByPlatform = useMemo(() => {
    const grouped = new Map<Platform, PlatformDownload[]>();
    for (const id of PLATFORM_ORDER) {
      grouped.set(id, []);
    }

    for (const download of downloads) {
      const list = grouped.get(download.platform);
      if (list) {
        list.push(download);
      }
    }

    return grouped;
  }, [downloads]);

  const displayName = getPlatformDisplayName(platform);
  const recommendedLabel = manifest
    ? `${displayName} ${manifest.version} (recommended)`
    : `${displayName} download`;

  return (
    <section className={styles.downloadMain}>
      <header className={styles.downloadHero}>
        <h1>Make voice your new keyboard.</h1>
        <p>Dictate four times faster using your voice.</p>
        <div className={styles.downloadPrimary}>
          <DownloadButton
            className={styles.downloadPrimaryButton}
            href={`#${OPTIONS_SECTION_ID}`}
          />
          <span className={styles.downloadRecommendation}>
            {recommendedLabel}
          </span>
        </div>
      </header>

      <section
        id={OPTIONS_SECTION_ID}
        className={styles.downloadOptions}
        aria-label="All download options"
      >
        {PLATFORM_ORDER.map((id: Platform) => {
          const config = PLATFORM_CONFIG[id];
          const platformDownloads = downloadsByPlatform.get(id) ?? [];
          const hasDownloads = platformDownloads.length > 0;

          return (
            <article key={id} className={styles.downloadCard}>
              <div className={styles.downloadCardHeader}>
                <span className={styles.downloadCardBadge}>
                  <config.Icon className={styles.downloadCardIcon} size={24} />
                </span>
                <div>
                  <h3 className={styles.downloadCardTitle}>{config.name}</h3>
                  <p className={styles.downloadVersionMeta}>
                    {hasDownloads
                      ? "Direct installers"
                      : isLoading
                        ? "Loading..."
                        : "Currently unavailable"}
                  </p>
                </div>
              </div>

              {hasDownloads ? (
                <ul className={styles.downloadLinkList}>
                  {platformDownloads.map((download) => (
                    <li key={download.key} className={styles.downloadLinkItem}>
                      <a
                        href={download.url}
                        className={styles.downloadLink}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <span>{download.label}</span>
                        {download.description ? (
                          <span className={styles.downloadLinkDescription}>
                            {download.description}
                          </span>
                        ) : null}
                      </a>
                    </li>
                  ))}
                </ul>
              ) : (
                <span className={styles.downloadEmpty}>
                  {isLoading
                    ? "Loading download options…"
                    : "No downloads available yet."}
                </span>
              )}
            </article>
          );
        })}
      </section>
    </section>
  );
}

export default DownloadPageContent;
