import { Stack, Typography } from "@mui/material";
import { useCallback } from "react";
import { FormattedMessage } from "react-intl";
import {
  setPreferredAgentMode,
  setPreferredAgentModeApiKeyId,
} from "../../actions/user.actions";
import { useAppStore } from "../../store";
import { getAllowsChangeAgentMode } from "../../utils/enterprise.utils";
import { ManagedByOrgNotice } from "../common/ManagedByOrgNotice";
import { type AgentMode } from "../../types/ai.types";
import {
  SegmentedControl,
  SegmentedControlOption,
} from "../common/SegmentedControl";
import { ApiKeyList } from "./ApiKeyList";
import { maybeArrayElements } from "./AIPostProcessingConfiguration";
import { VoquillCloudSetting } from "./VoquillCloudSetting";

type AIAgentModeConfigurationProps = {
  hideCloudOption?: boolean;
};

export const AIAgentModeConfiguration = ({
  hideCloudOption,
}: AIAgentModeConfigurationProps) => {
  const agentMode = useAppStore((state) => state.settings.agentMode);
  const allowChange = useAppStore(getAllowsChangeAgentMode);

  const handleModeChange = useCallback((mode: AgentMode) => {
    void setPreferredAgentMode(mode);
  }, []);

  const handleApiKeyChange = useCallback((id: string | null) => {
    void setPreferredAgentModeApiKeyId(id);
  }, []);

  if (!allowChange) {
    return <ManagedByOrgNotice />;
  }

  return (
    <Stack spacing={3} alignItems="flex-start" sx={{ width: "100%" }}>
      <SegmentedControl<AgentMode>
        value={agentMode.mode}
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
        ariaLabel="Agent mode"
      />

      {agentMode.mode === "none" && (
        <Typography variant="body2" color="text.secondary">
          <FormattedMessage defaultMessage="Agent mode is disabled." />
        </Typography>
      )}

      {agentMode.mode === "api" && (
        <ApiKeyList
          selectedApiKeyId={agentMode.selectedApiKeyId}
          onChange={handleApiKeyChange}
          context="post-processing"
        />
      )}

      {agentMode.mode === "cloud" && <VoquillCloudSetting />}
    </Stack>
  );
};
