import { Stack, Typography } from "@mui/material";
import { useCallback } from "react";
import { useAppStore } from "../../store";
import { type PostProcessingMode } from "../../types/ai.types";
import { SegmentedControl } from "../common/SegmentedControl";
import { ApiKeyList } from "./ApiKeyList";
import {
  setPreferredPostProcessingApiKeyId,
  setPreferredPostProcessingMode,
} from "../../actions/user.actions";

export const AIPostProcessingConfiguration = () => {
  const postProcessing = useAppStore(
    (state) => state.settings.aiPostProcessing
  );

  const handleModeChange = useCallback((mode: PostProcessingMode) => {
    void setPreferredPostProcessingMode(mode);
  }, []);

  const handleApiKeyChange = useCallback((id: string | null) => {
    void setPreferredPostProcessingApiKeyId(id);
  }, []);

  return (
    <Stack spacing={3} alignItems="flex-start" sx={{ width: "100%" }}>
      <SegmentedControl<PostProcessingMode>
        value={postProcessing.mode}
        onChange={handleModeChange}
        options={[
          { value: "none", label: "None" },
          { value: "api", label: "API key" },
        ]}
        ariaLabel="Post-processing mode"
      />

      {postProcessing.mode === "none" ? (
        <Typography variant="body2" color="text.secondary">
          No AI post-processing will run on new transcripts.
        </Typography>
      ) : (
        <ApiKeyList
          selectedApiKeyId={postProcessing.selectedApiKeyId}
          onChange={handleApiKeyChange}
        />
      )}
    </Stack>
  );
};
