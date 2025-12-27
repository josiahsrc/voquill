import type { CSSProperties } from "react";
import { FormattedMessage } from "react-intl";
import styles from "../styles/page.module.css";

type GitHubButtonProps = {
  className?: string;
};

export function GitHubButton({ className }: GitHubButtonProps) {
  const classes = [styles.secondaryButton, className].filter(Boolean).join(" ");

  return (
    <a
      href="https://github.com/josiahsrc/voquill"
      className={classes}
      target="_blank"
      rel="noopener noreferrer"
    >
      <GitHubIcon className={styles.buttonIcon} size={20} />
      <span>
        <FormattedMessage defaultMessage="GitHub" />
      </span>
    </a>
  );
}

type GitHubIconProps = {
  className?: string;
  size?: number;
};

function GitHubIcon({ className, size = 20 }: GitHubIconProps) {
  const style: CSSProperties = {
    display: "inline-block",
    width: `${size}px`,
    height: `${size}px`,
    backgroundColor: "currentColor",
    mask: "url(/github.svg) center / contain no-repeat",
    WebkitMask: "url(/github.svg) center / contain no-repeat",
  };

  return <span aria-hidden="true" className={className} style={style} />;
}

export default GitHubButton;
