import { Box, SxProps, Theme } from "@mui/material";
import { useEffect, useState } from "react";
import { getStorageRepo } from "../../repos";

export type StorageImageProps = {
  path?: string | null;
  alt?: string;
  size?: number;
  sx?: SxProps<Theme>;
};

export const StorageImage = ({
  path,
  alt = "",
  size = 40,
  sx,
}: StorageImageProps) => {
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);

  useEffect(() => {
    let isActive = true;
    if (!path) {
      setDownloadUrl(null);
      return;
    }

    void (async () => {
      try {
        const url = await getStorageRepo().getDownloadUrl(path);
        if (isActive) {
          setDownloadUrl(url);
        }
      } catch (error) {
        console.error("Failed to load storage image", error);
        if (isActive) {
          setDownloadUrl(null);
        }
      }
    })();

    return () => {
      isActive = false;
    };
  }, [path]);

  if (!path) {
    return null;
  }

  return (
    <Box
      component="img"
      src={downloadUrl ?? undefined}
      alt={alt}
      sx={{
        width: size,
        height: size,
        objectFit: "cover",
        backgroundColor: "level1",
        flexShrink: 0,
        ...sx,
      }}
    />
  );
};
