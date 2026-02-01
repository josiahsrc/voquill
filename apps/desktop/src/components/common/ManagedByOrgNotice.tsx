import { Box, Typography } from "@mui/material";
import { FormattedMessage } from "react-intl";
import { useAppStore } from "../../store";

export const ManagedByOrgNotice = () => {
  const orgName = useAppStore((state) => state.enterpriseLicense?.org);

  return (
    <Box
      sx={{
        border: 1,
        borderColor: "divider",
        borderRadius: 1,
        px: 2,
        py: 1.5,
      }}
    >
      <Typography variant="body2" color="text.secondary">
        <FormattedMessage
          defaultMessage="This setting is managed by {org}."
          values={{ org: orgName ?? "your organization" }}
        />
      </Typography>
    </Box>
  );
};
