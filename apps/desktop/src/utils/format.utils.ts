export const formatDuration = (ms: number | undefined) => {
  if (!Number.isFinite(ms)) {
    return "0 ms";
  }
  const value = Number(ms);
  if (value < 1000) {
    return `${value.toFixed(0)} ms`;
  }
  const seconds = value / 1000;
  if (seconds < 60) {
    return `${seconds.toFixed(1)} s`;
  }
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds - minutes * 60;
  if (minutes >= 60) {
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return `${hours}h ${remainingMinutes}m ${remainingSeconds.toFixed(0)}s`;
  }
  return `${minutes}m ${remainingSeconds.toFixed(0)}s`;
};

export const formatSize = (bytes: number | undefined) => {
  if (!Number.isFinite(bytes)) {
    return "0 B";
  }
  const value = Number(bytes);
  if (value < 1024) {
    return `${value.toFixed(0)} B`;
  }
  const kilobytes = value / 1024;
  if (kilobytes < 1024) {
    return `${kilobytes.toFixed(1)} KB`;
  }
  const megabytes = kilobytes / 1024;
  if (megabytes < 1024) {
    return `${megabytes.toFixed(2)} MB`;
  }
  const gigabytes = megabytes / 1024;
  return `${gigabytes.toFixed(2)} GB`;
};
