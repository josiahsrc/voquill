import styles from "./privacy-lock.module.css";

type PrivacyLockProps = {
  className?: string;
};

export default function PrivacyLock({ className }: PrivacyLockProps) {
  const wrapperClass = className
    ? `${styles.wrapper} ${className}`
    : styles.wrapper;

  return (
    <div className={wrapperClass} aria-hidden="true">
      <div className={styles.halo} />
      <span className={styles.particle} />
      <span className={styles.particle} />
      <span className={styles.particle} />
      <div className={styles.lock}>
        <div className={styles.shackle} />
        <div className={styles.body}>
          <div className={styles.keyhole}>
            <div className={styles.keyholeHead} />
            <div className={styles.keyholeStem} />
          </div>
        </div>
      </div>
      <span className={styles.srOnly}>
        Animated lock icon representing privacy and security.
      </span>
    </div>
  );
}
