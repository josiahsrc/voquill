import AddIcon from "@mui/icons-material/Add";
import ArrowDownwardIcon from "@mui/icons-material/ArrowDownward";
import ArrowUpwardIcon from "@mui/icons-material/ArrowUpward";
import CloseIcon from "@mui/icons-material/Close";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import {
  Box,
  Checkbox,
  Collapse,
  FormControl,
  FormControlLabel,
  IconButton,
  InputLabel,
  MenuItem,
  Paper,
  Radio,
  RadioGroup,
  Select,
  Stack,
  Typography,
} from "@mui/material";
import { OpenRouterProviderRouting as ProviderRoutingType } from "@repo/types";
import { useCallback, useEffect, useMemo, useState } from "react";
import { FormattedMessage } from "react-intl";
import {
  getOpenRouterConfigForKey,
  loadOpenRouterProviders,
  updateOpenRouterProviderRouting,
} from "../../../actions/openrouter.actions";
import { useAppStore } from "../../../store";

type OpenRouterProviderRoutingProps = {
  apiKeyId: string;
  disabled?: boolean;
};

export const OpenRouterProviderRouting = ({
  apiKeyId,
  disabled = false,
}: OpenRouterProviderRoutingProps) => {
  const [expanded, setExpanded] = useState(false);
  const [saving, setSaving] = useState(false);

  // Get providers from state
  const providers = useAppStore(
    (state) => state.settings.aiPostProcessing.openRouterProviders,
  );
  const providersStatus = useAppStore(
    (state) => state.settings.aiPostProcessing.openRouterProvidersStatus,
  );

  // Load providers when expanded
  useEffect(() => {
    if (expanded && providersStatus === "idle") {
      void loadOpenRouterProviders();
    }
  }, [expanded, providersStatus]);

  // Get current config
  const config = getOpenRouterConfigForKey(apiKeyId);
  const routing = config?.providerRouting ?? {};

  const providerOrder = routing.order ?? [];
  const allowFallbacks = routing.allow_fallbacks ?? true;
  const dataCollection = routing.data_collection ?? "allow";

  // Available providers not yet in the order list
  const availableToAdd = useMemo(() => {
    return providers.filter((p) => !providerOrder.includes(p.slug));
  }, [providers, providerOrder]);

  // Helper to get provider name by slug
  const getProviderName = useCallback(
    (slug: string) => {
      const provider = providers.find((p) => p.slug === slug);
      return provider?.name ?? slug;
    },
    [providers],
  );

  // Summary for collapsed state
  const summary = useMemo(() => {
    if (providerOrder.length === 0) {
      return null;
    }
    const names = providerOrder.map(getProviderName);
    if (names.length <= 2) {
      return names.join(", ");
    }
    return `${names.slice(0, 2).join(", ")} +${names.length - 2}`;
  }, [providerOrder, getProviderName]);

  const handleToggleExpand = useCallback(() => {
    if (!disabled) {
      setExpanded((prev) => !prev);
    }
  }, [disabled]);

  const saveRouting = useCallback(
    async (newRouting: ProviderRoutingType) => {
      setSaving(true);
      try {
        await updateOpenRouterProviderRouting(apiKeyId, newRouting);
      } finally {
        setSaving(false);
      }
    },
    [apiKeyId],
  );

  const handleAddProvider = useCallback(
    (provider: string) => {
      const newOrder = [...providerOrder, provider];
      void saveRouting({
        ...routing,
        order: newOrder,
      });
    },
    [providerOrder, routing, saveRouting],
  );

  const handleRemoveProvider = useCallback(
    (index: number) => {
      const newOrder = providerOrder.filter((_, i) => i !== index);
      void saveRouting({
        ...routing,
        order: newOrder.length > 0 ? newOrder : undefined,
      });
    },
    [providerOrder, routing, saveRouting],
  );

  const handleMoveProvider = useCallback(
    (index: number, direction: "up" | "down") => {
      const newOrder = [...providerOrder];
      const newIndex = direction === "up" ? index - 1 : index + 1;
      if (newIndex < 0 || newIndex >= newOrder.length) {
        return;
      }
      [newOrder[index], newOrder[newIndex]] = [
        newOrder[newIndex],
        newOrder[index],
      ];
      void saveRouting({
        ...routing,
        order: newOrder,
      });
    },
    [providerOrder, routing, saveRouting],
  );

  const handleFallbacksChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      void saveRouting({
        ...routing,
        allow_fallbacks: event.target.checked,
      });
    },
    [routing, saveRouting],
  );

  const handleDataCollectionChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      void saveRouting({
        ...routing,
        data_collection: event.target.value as "allow" | "deny",
      });
    },
    [routing, saveRouting],
  );

  return (
    <Box sx={{ mt: 1.5 }}>
      {/* Collapsed header */}
      <Box
        onClick={handleToggleExpand}
        sx={{
          display: "flex",
          alignItems: "center",
          gap: 1,
          cursor: disabled ? "default" : "pointer",
          opacity: disabled ? 0.5 : 1,
          py: 0.5,
          "&:hover": {
            "& .expand-icon": {
              color: disabled ? "action.disabled" : "text.primary",
            },
          },
        }}
      >
        <ExpandMoreIcon
          className="expand-icon"
          fontSize="small"
          color="action"
          sx={{
            transition: "transform 0.2s ease",
            transform: expanded ? "rotate(180deg)" : "rotate(0deg)",
          }}
        />
        <Typography
          variant="body2"
          color="text.secondary"
          sx={{ fontWeight: 500 }}
        >
          <FormattedMessage defaultMessage="Advanced Routing" />
        </Typography>
        {summary && !expanded && (
          <Typography variant="caption" color="text.secondary" sx={{ ml: 1 }}>
            ({summary})
          </Typography>
        )}
      </Box>

      {/* Expanded content */}
      <Collapse in={expanded}>
        <Paper
          variant="outlined"
          sx={{
            mt: 1,
            p: 2,
            opacity: saving ? 0.7 : 1,
            pointerEvents: saving ? "none" : "auto",
          }}
        >
          <Stack spacing={2.5}>
            {/* Provider Priority */}
            <Box>
              <Typography
                variant="body2"
                fontWeight={600}
                sx={{ mb: 1 }}
              >
                <FormattedMessage defaultMessage="Provider Priority" />
              </Typography>
              <Typography
                variant="caption"
                color="text.secondary"
                sx={{ mb: 1.5, display: "block" }}
              >
                <FormattedMessage defaultMessage="Set preferred providers in order of priority" />
              </Typography>

              {providerOrder.length > 0 && (
                <Stack spacing={0.5} sx={{ mb: 1.5 }}>
                  {providerOrder.map((provider, index) => (
                    <Paper
                      key={provider}
                      variant="outlined"
                      sx={{
                        px: 1.5,
                        py: 0.75,
                        display: "flex",
                        alignItems: "center",
                        gap: 1,
                      }}
                    >
                      <Stack direction="row" spacing={0.25}>
                        <IconButton
                          size="small"
                          disabled={index === 0}
                          onClick={() => handleMoveProvider(index, "up")}
                          sx={{ p: 0.25 }}
                        >
                          <ArrowUpwardIcon fontSize="small" />
                        </IconButton>
                        <IconButton
                          size="small"
                          disabled={index === providerOrder.length - 1}
                          onClick={() => handleMoveProvider(index, "down")}
                          sx={{ p: 0.25 }}
                        >
                          <ArrowDownwardIcon fontSize="small" />
                        </IconButton>
                      </Stack>
                      <Typography variant="body2" sx={{ flex: 1 }}>
                        {getProviderName(provider)}
                      </Typography>
                      <IconButton
                        size="small"
                        onClick={() => handleRemoveProvider(index)}
                        sx={{ p: 0.25 }}
                      >
                        <CloseIcon fontSize="small" />
                      </IconButton>
                    </Paper>
                  ))}
                </Stack>
              )}

              {availableToAdd.length > 0 && (
                <FormControl size="small" sx={{ minWidth: 200 }}>
                  <InputLabel id="add-provider-label">
                    <FormattedMessage defaultMessage="Add provider" />
                  </InputLabel>
                  <Select
                    labelId="add-provider-label"
                    value=""
                    label={<FormattedMessage defaultMessage="Add provider" />}
                    onChange={(e) => handleAddProvider(e.target.value)}
                    startAdornment={<AddIcon fontSize="small" sx={{ mr: 0.5 }} />}
                  >
                    {availableToAdd.map((provider) => (
                      <MenuItem key={provider.slug} value={provider.slug}>
                        {provider.name}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              )}
            </Box>

            {/* Allow Fallbacks */}
            <Box>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={allowFallbacks}
                    onChange={handleFallbacksChange}
                    size="small"
                  />
                }
                label={
                  <Box>
                    <Typography variant="body2">
                      <FormattedMessage defaultMessage="Allow fallbacks" />
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      <FormattedMessage defaultMessage="Use other providers if preferred ones are unavailable" />
                    </Typography>
                  </Box>
                }
                sx={{ alignItems: "flex-start", ml: 0 }}
              />
            </Box>

            {/* Data Collection */}
            <Box>
              <Typography variant="body2" fontWeight={600} sx={{ mb: 0.5 }}>
                <FormattedMessage defaultMessage="Data Collection" />
              </Typography>
              <RadioGroup
                value={dataCollection}
                onChange={handleDataCollectionChange}
              >
                <FormControlLabel
                  value="allow"
                  control={<Radio size="small" />}
                  label={
                    <Box>
                      <Typography variant="body2">
                        <FormattedMessage defaultMessage="Allow" />
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        <FormattedMessage defaultMessage="Help improve OpenRouter" />
                      </Typography>
                    </Box>
                  }
                  sx={{ alignItems: "flex-start", ml: 0 }}
                />
                <FormControlLabel
                  value="deny"
                  control={<Radio size="small" />}
                  label={
                    <Box>
                      <Typography variant="body2">
                        <FormattedMessage defaultMessage="Deny" />
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        <FormattedMessage defaultMessage="More private, no data collection" />
                      </Typography>
                    </Box>
                  }
                  sx={{ alignItems: "flex-start", ml: 0 }}
                />
              </RadioGroup>
            </Box>
          </Stack>
        </Paper>
      </Collapse>
    </Box>
  );
};
