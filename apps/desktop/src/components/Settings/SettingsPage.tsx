import { Stack, Typography } from "@mui/material";
import { Section } from "../Common/Section";
import { DashboardEntryLayout } from "../Dashboard/DashboardEntryLayout";

export default function SettingsPage() {
  const advanced = (
    <Section
      title="Advanced"
      description="Manage your account preferences and settings."
    >
      {/* <ListTile
        title="Terms & conditions"
        href="/terms"
        leading={<DescriptionOutlined />}
      />
      <ListTile
        title="Privacy policy"
        href="/privacy"
        leading={<PrivacyTipOutlined />}
      /> */}
      {/* <ListTile
        title="Sign out"
        leading={<LogoutOutlined />}
        onClick={handleSignOut}
      /> */}
    </Section>
  );

  const dangerZone = (
    <Section
      title="Danger zone"
      description="Be careful with these actions. They can have significant consequences for your account."
    >
      {/* <ListTile
        title="Delete account"
        leading={<DeleteForeverOutlined />}
        onClick={handleDeleteAccount}
      /> */}
    </Section>
  );

  return (
    <DashboardEntryLayout>
      <Stack direction="column">
        <Typography variant="h4" fontWeight={700} sx={{ marginBottom: 4 }}>
          Account Settings
        </Typography>
        {advanced}
        {dangerZone}
      </Stack>
    </DashboardEntryLayout>
  );
}
