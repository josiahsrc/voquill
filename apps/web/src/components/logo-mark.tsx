type LogoMarkProps = {
  className?: string;
  size?: number;
};

export function LogoMark({ className, size = 28 }: LogoMarkProps) {
  return (
    <span
      className={className}
      style={{ width: size, height: size }}
      aria-hidden="true"
    />
  );
}

export default LogoMark;
