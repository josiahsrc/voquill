import styles from "../styles/page.module.css";

type GitHubButtonProps = {
  className?: string;
};

export function GitHubButton({ className }: GitHubButtonProps) {
  const classes = [styles.secondaryButton, className].filter(Boolean).join(" ");
  const size = 20;

  return (
    <a
      href="https://github.com/josiahsrc/voquill"
      className={classes}
      target="_blank"
      rel="noopener noreferrer"
    >
      <GitHubIcon className={styles.buttonIcon} size={size} />
      <span>GitHub</span>
    </a>
  );
}

type GitHubIconProps = {
  className?: string;
  size?: number;
};

function GitHubIcon({ className, size = 20 }: GitHubIconProps) {
  return (
    <svg
      aria-hidden="true"
      focusable="false"
      viewBox="0 0 24 24"
      width={size}
      height={size}
      className={className}
    >
      <path
        fill="currentColor"
        fillRule="evenodd"
        clipRule="evenodd"
        d="M12 1.75C6.07 1.75 1.25 6.57 1.25 12.5c0 4.74 3.07 8.76 7.34 10.18.54.11.74-.24.74-.53 0-.26-.01-1.13-.02-2.05-3 0.65-3.63-1.27-3.63-1.27-.49-1.25-1.2-1.58-1.2-1.58-.98-.67.07-.66.07-.66 1.08.08 1.65 1.11 1.65 1.11.96 1.64 2.51 1.17 3.13.9.1-.7.37-1.17.67-1.44-2.39-.27-4.9-1.2-4.9-5.35 0-1.18.42-2.15 1.11-2.9-.11-.27-.48-1.36.11-2.84 0 0 .9-.29 2.95 1.11a10.3 10.3 0 0 1 5.36 0c2.05-1.4 2.95-1.11 2.95-1.11.6 1.48.23 2.57.12 2.84.69.75 1.1 1.72 1.1 2.9 0 4.15-2.51 5.08-4.91 5.35.38.33.72.97.72 1.96 0 1.41-.01 2.55-.01 2.9 0 .29.2.64.75.53 4.26-1.42 7.32-5.44 7.32-10.18C22.75 6.57 17.93 1.75 12 1.75Z"
      />
    </svg>
  );
}

export default GitHubButton;
