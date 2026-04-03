import { Stack, Typography } from "@mui/material";
import { useCallback } from "react";
import { FormattedMessage } from "react-intl";
import {
  setPreferredAgentMode,
  setPreferredAgentModeApiKeyId,
} from "../../actions/user.actions";
import { useAppStore } from "../../store";
import { type AgentMode } from "../../types/ai.types";
import { getEffectiveAgentMode } from "../../utils/user.utils";
import {
  SegmentedControl,
  SegmentedControlOption,
} from "../common/SegmentedControl";
import { maybeArrayElements } from "./AIPostProcessingConfiguration";
import { ApiKeyList } from "./ApiKeyList";
import { VoquillCloudSetting } from "./VoquillCloudSetting";

type AIAgentModeConfigurationProps = {
  hideCloudOption?: boolean;
};

export const AIAgentModeConfiguration = ({
  hideCloudOption,
}: AIAgentModeConfigurationProps) => {
  const agentMode = useAppStore((state) => state.settings.agentMode);
  const effectiveMode = useAppStore(getEffectiveAgentMode);

  const handleModeChange = useCallback((mode: AgentMode) => {
    void setPreferredAgentMode(mode);
  }, []);

  const handleApiKeyChange = useCallback((id: string | null) => {
    void setPreferredAgentModeApiKeyId(id);
  }, []);

  return (
    <Stack spacing={3} alignItems="flex-start" sx={{ width: "100%" }}>
      <SegmentedControl<AgentMode>
        value={effectiveMode}
        onChange={handleModeChange}
        options={[
          ...maybeArrayElements<SegmentedControlOption<AgentMode>>(
            !hideCloudOption,
            [
              {
                value: "cloud",
                label: "Voquill",
              },
            ],
          ),
          { value: "api", label: "API" },
          { value: "none", label: "Off" },
        ]}
        ariaLabel="Assistant mode"
      />

      {effectiveMode === "none" && (
        <Typography variant="body2" color="text.secondary">
          <FormattedMessage defaultMessage="Assistant mode is disabled." />
        </Typography>
      )}

      {effectiveMode === "api" && (
        <ApiKeyList
          selectedApiKeyId={agentMode.selectedApiKeyId}
          onChange={handleApiKeyChange}
          context="post-processing"
        />
      )}

      {effectiveMode === "cloud" && <VoquillCloudSetting />}
    </Stack>
  );
};
