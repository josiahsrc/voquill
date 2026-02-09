import { Stack, TextField, Typography } from "@mui/material";
import { useCallback } from "react";
import { FormattedMessage, useIntl } from "react-intl";
import {
  setOpenclawGatewayUrl,
  setOpenclawToken,
  setPreferredAgentMode,
  setPreferredAgentModeApiKeyId,
} from "../../actions/user.actions";
import { useAppStore } from "../../store";
import { type AgentMode } from "../../types/ai.types";
import {
  getAllowsChangeAgentMode,
  getIsEnterpriseEnabled,
} from "../../utils/enterprise.utils";
import { ManagedByOrgNotice } from "../common/ManagedByOrgNotice";
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
  const allowChange = useAppStore(getAllowsChangeAgentMode);
  const isEnterprise = getIsEnterpriseEnabled();
  const intl = useIntl();

  const handleModeChange = useCallback((mode: AgentMode) => {
    void setPreferredAgentMode(mode);
  }, []);

  const handleApiKeyChange = useCallback((id: string | null) => {
    void setPreferredAgentModeApiKeyId(id);
  }, []);

  const handleGatewayUrlChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      void setOpenclawGatewayUrl(e.target.value || null);
    },
    [],
  );

  const handleTokenChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      void setOpenclawToken(e.target.value || null);
    },
    [],
  );

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
          ...maybeArrayElements<SegmentedControlOption<AgentMode>>(
            !isEnterprise,
            [
              {
                value: "openclaw",
                label: "OpenClaw",
              },
            ],
          ),
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

      {agentMode.mode === "openclaw" && (
        <Stack spacing={2} sx={{ width: "100%" }}>
          <Typography variant="body2" color="text.secondary" component="div">
            <FormattedMessage
              defaultMessage="To connect, you need your <b>gateway URL</b> and <b>token</b>. <ul><li>Gateway URL is <code>ws://localhost:18789</code> by default.</li><li>To find your token, run: <code>openclaw config get gateway.auth.token</code></li></ul>"
              values={{
                b: (chunks: React.ReactNode) => <strong>{chunks}</strong>,
                ul: (chunks: React.ReactNode) => (
                  <ul style={{ margin: "8px 0", paddingLeft: 20 }}>{chunks}</ul>
                ),
                li: (chunks: React.ReactNode) => (
                  <li style={{ marginBottom: 4 }}>{chunks}</li>
                ),
                code: (chunks: React.ReactNode) => (
                  <code
                    style={{
                      fontSize: "0.85em",
                      padding: "1px 4px",
                      borderRadius: 4,
                      backgroundColor: "rgba(0,0,0,0.08)",
                    }}
                  >
                    {chunks}
                  </code>
                ),
              }}
            />
          </Typography>
          <TextField
            label={intl.formatMessage({
              defaultMessage: "Gateway URL",
            })}
            placeholder="ws://localhost:18789"
            value={agentMode.openclawGatewayUrl ?? ""}
            onChange={handleGatewayUrlChange}
            size="small"
            fullWidth
          />
          <TextField
            label={intl.formatMessage({
              defaultMessage: "OpenClaw token",
            })}
            value={agentMode.openclawToken ?? ""}
            onChange={handleTokenChange}
            size="small"
            fullWidth
            type="password"
          />
        </Stack>
      )}
    </Stack>
  );
};
