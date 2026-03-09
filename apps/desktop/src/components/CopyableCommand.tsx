import { CheckOutlined, ContentCopyOutlined } from "@mui/icons-material";
import { IconButton, Stack, Typography } from "@mui/material";
import { useCallback, useState } from "react";

type CopyableCommandProps = {
  command: string;
};

export const CopyableCommand = ({ command }: CopyableCommandProps) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(command);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [command]);

  return (
    <Stack
      direction="row"
      alignItems="center"
      spacing={1}
      sx={{
        p: 1.5,
        borderRadius: 1,
        bgcolor: "action.hover",
      }}
    >
      <Typography
        component="code"
        sx={{
          flex: 1,
          fontFamily: "monospace",
          fontSize: "0.8rem",
          wordBreak: "break-all",
          whiteSpace: "pre-wrap",
          lineHeight: 1.5,
        }}
      >
        {command}
      </Typography>
      <IconButton size="small" onClick={handleCopy} sx={{ flexShrink: 0 }}>
        {copied ? (
          <CheckOutlined
            sx={{
              fontSize: 16,
              color: "success.main",
              transition: "transform 0.2s ease, opacity 0.2s ease",
            }}
          />
        ) : (
          <ContentCopyOutlined
            sx={{
              fontSize: 16,
              transition: "transform 0.2s ease, opacity 0.2s ease",
            }}
          />
        )}
      </IconButton>
    </Stack>
  );
};
