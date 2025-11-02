import { Stack, Typography } from "@mui/material";
import { useCallback, useEffect } from "react";
import { useAppStore } from "../../store";
import { type PostProcessingMode } from "../../types/ai.types";
import { SegmentedControl } from "../common/SegmentedControl";
import { ApiKeyList } from "./ApiKeyList";
import {
  setPreferredPostProcessingApiKeyId,
  setPreferredPostProcessingMode,
} from "../../actions/user.actions";
import { getIsPaying } from "../../utils/member.utils";

export const AIPostProcessingConfiguration = () => {
  const postProcessing = useAppStore(
    (state) => state.settings.aiPostProcessing
  );
  const isPro = useAppStore(getIsPaying);

  useEffect(() => {
    if (!isPro && postProcessing.mode === "cloud") {
      void setPreferredPostProcessingMode("none");
    }
  }, [isPro, postProcessing.mode]);

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
          { value: "cloud", label: "Voquill Cloud", disabled: !isPro },
          { value: "api", label: "API key" },
          { value: "none", label: "Disabled" },
        ]}
        ariaLabel="Post-processing mode"
      />

      {postProcessing.mode === "none" && (
        <Typography variant="body2" color="text.secondary">
          No AI post-processing will run on new transcripts.
        </Typography>
      )}

      {postProcessing.mode === "api" && (
        <ApiKeyList
          selectedApiKeyId={postProcessing.selectedApiKeyId}
          onChange={handleApiKeyChange}
        />
      )}

      {postProcessing.mode === "cloud" && (
        <Typography variant="body2" color="text.secondary">
          Voquill Cloud tidies up transcripts automatically—no prompts or API
          keys required.
        </Typography>
      )}
    </Stack>
  );
};
