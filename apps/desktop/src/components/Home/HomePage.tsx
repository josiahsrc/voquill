import { Box, Stack, TextField, Typography } from "@mui/material";
import { useMemo, useState } from "react";
import { useAppStore } from "../../store";
import { getMyUser, getMyUserName } from "../../utils/user.utils";
import { Section } from "../Common/Section";
import { Stat } from "./Stat";

export default function HomePage() {
  const user = useAppStore(getMyUser);
  const userName = useAppStore(getMyUserName);

  const dbName = useMemo(() => user?.name || "", [user]);
  const dbBio = useMemo(() => user?.bio || "", [user]);

  const [name, setName] = useState(dbName);
  const [bio, setBio] = useState(dbBio);

  const handleChangeName = (e: React.ChangeEvent<HTMLInputElement>) => {
    setName(e.target.value);
  };

  const handleBlurName = () => {
    const trimmed = name.trim();
    if (trimmed) {
      // blaze().update(path.users(user?.id), {
      //   name: trimmed,
      // });
    } else {
      setName(dbName);
    }
  };

  const handleChangeBio = (e: React.ChangeEvent<HTMLInputElement>) => {
    setBio(e.target.value);
  };

  const handleBlurBio = () => {
    // blaze().update(path.users(user?.id), {
    //   bio: bio.trim(),
    // });
  };

  const stats = (
    <Stack
      direction="row"
      spacing={2}
      sx={{ marginBottom: 2 }}
      justifyContent="space-around"
    >
      <Stat label="Words this month" value={10} />
      <Stat label="Words total" value={200} />
    </Stack>
  );

  const aboutYou = (
    <Section
      title="About you"
      description="We'll use this information to personalize your experience. It'll be used in things like email signatures and writing style."
    >
      <TextField
        variant="outlined"
        fullWidth
        value={name}
        onChange={handleChangeName}
        onBlur={handleBlurName}
        sx={{ marginBottom: 2 }}
        placeholder="Enter your name"
        autoComplete="name"
        slotProps={{
          htmlInput: {
            "data-voquill-ignore": "true",
          },
        }}
      />
      <TextField
        variant="outlined"
        fullWidth
        value={bio}
        onChange={handleChangeBio}
        onBlur={handleBlurBio}
        sx={{ marginBottom: 2 }}
        multiline
        minRows={3}
        maxRows={5}
        placeholder="Bio (optional)"
        autoComplete="off"
      />
    </Section>
  );

  return (
    <Stack direction="column">
      <Typography variant="h4" fontWeight={700} sx={{ mb: 0.5 }}>
        Welcome, {userName}
      </Typography>
      <Box sx={{ my: 8 }}>{stats}</Box>
      {aboutYou}
    </Stack>
  );
}
