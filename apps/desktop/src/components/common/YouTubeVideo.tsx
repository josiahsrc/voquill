import { Box, type BoxProps } from "@mui/material";

type YouTubeVideoProps = {
  videoId: string;
  title?: string;
  /**
   * Supports optional YouTube player parameters.
   * Only the most common ones are exposed for now.
   */
  autoplay?: boolean;
  startSeconds?: number;
  aspectRatio?: number;
} & BoxProps;

/**
 * Responsive embedded YouTube video that can be dropped into any layout.
 */
export function YouTubeVideo({
  videoId,
  title = "YouTube video",
  autoplay = false,
  startSeconds,
  aspectRatio = 16 / 9,
  sx,
  ...boxProps
}: YouTubeVideoProps) {
  const params = new URLSearchParams({
    rel: "0",
    modestbranding: "1",
    playsinline: "1",
  });

  if (autoplay) {
    params.set("autoplay", "1");
    params.set("mute", "1"); // Autoplay works more reliably when muted.
  }

  if (startSeconds !== undefined) {
    params.set("start", String(startSeconds));
  }

  const safeAspectRatio = aspectRatio > 0 ? aspectRatio : 16 / 9;
  const src = `https://www.youtube.com/embed/${videoId}?${params.toString()}`;

  return (
    <Box
      {...boxProps}
      sx={{
        position: "relative",
        width: "100%",
        pt: `${100 / safeAspectRatio}%`,
        ...sx,
      }}
    >
      <Box
        component="iframe"
        src={src}
        title={title}
        loading="lazy"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
        allowFullScreen
        sx={{
          border: 0,
          position: "absolute",
          inset: 0,
          width: "100%",
          height: "100%",
          borderRadius: 2,
          boxShadow: 3,
        }}
      />
    </Box>
  );
}
