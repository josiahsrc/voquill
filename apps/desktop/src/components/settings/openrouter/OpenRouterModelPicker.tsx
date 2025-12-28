import CloseIcon from "@mui/icons-material/Close";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import SearchIcon from "@mui/icons-material/Search";
import StarIcon from "@mui/icons-material/Star";
import StarBorderIcon from "@mui/icons-material/StarBorder";
import {
  Box,
  CircularProgress,
  Divider,
  IconButton,
  InputAdornment,
  Paper,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { OpenRouterModel } from "@repo/types";
import { OPENROUTER_FAVORITE_MODELS } from "@repo/voice-ai";
import { useCallback, useEffect, useMemo, useState } from "react";
import { FormattedMessage } from "react-intl";
import { Virtuoso } from "react-virtuoso";
import {
  loadOpenRouterModels,
  setOpenRouterSearchQuery,
  toggleOpenRouterFavoriteModel,
  getOpenRouterConfigForKey,
} from "../../../actions/openrouter.actions";
import { useAppStore } from "../../../store";

type OpenRouterModelPickerProps = {
  apiKeyId: string;
  selectedModel: string | null;
  onModelSelect: (modelId: string) => void;
  disabled?: boolean;
};

type ModelRowProps = {
  model: OpenRouterModel;
  selected: boolean;
  isFavorite: boolean;
  onSelect: () => void;
  onToggleFavorite: () => void;
};

const ModelRow = ({
  model,
  selected,
  isFavorite,
  onSelect,
  onToggleFavorite,
}: ModelRowProps) => {
  const [hovered, setHovered] = useState(false);

  return (
    <Box
      onClick={onSelect}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      sx={{
        px: 1.5,
        py: 1,
        cursor: "pointer",
        display: "flex",
        alignItems: "center",
        gap: 1,
        backgroundColor: selected
          ? "action.selected"
          : hovered
            ? "action.hover"
            : "transparent",
        borderRadius: 1,
        transition: "background-color 0.15s ease",
      }}
    >
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Typography
          variant="body2"
          fontWeight={selected ? 600 : 400}
          noWrap
          sx={{ lineHeight: 1.3 }}
        >
          {model.name}
        </Typography>
        <Typography
          variant="caption"
          color="text.secondary"
          noWrap
          sx={{ lineHeight: 1.3 }}
        >
          {model.id}
        </Typography>
      </Box>
      {(hovered || isFavorite) && (
        <IconButton
          size="small"
          onClick={(e) => {
            e.stopPropagation();
            onToggleFavorite();
          }}
          sx={{
            p: 0.5,
            color: isFavorite ? "warning.main" : "action.active",
          }}
        >
          {isFavorite ? (
            <StarIcon fontSize="small" />
          ) : (
            <StarBorderIcon fontSize="small" />
          )}
        </IconButton>
      )}
      {selected && !hovered && !isFavorite && (
        <Typography variant="caption" color="primary.main" fontWeight={600}>
          <FormattedMessage defaultMessage="Selected" />
        </Typography>
      )}
    </Box>
  );
};

export const OpenRouterModelPicker = ({
  apiKeyId,
  selectedModel,
  onModelSelect,
  disabled = false,
}: OpenRouterModelPickerProps) => {
  const [expanded, setExpanded] = useState(false);
  const models = useAppStore(
    (state) => state.settings.aiPostProcessing.openRouterModels,
  );
  const modelsStatus = useAppStore(
    (state) => state.settings.aiPostProcessing.openRouterModelsStatus,
  );
  const searchQuery = useAppStore(
    (state) => state.settings.aiPostProcessing.openRouterSearchQuery,
  );

  // Get user favorites from the API key config
  const config = getOpenRouterConfigForKey(apiKeyId);
  const userFavorites = config?.favoriteModels;

  // Use user's favorites if they've customized them, otherwise use defaults
  // This allows users to remove default favorites by toggling them off
  const allFavoriteIds = useMemo(() => {
    if (userFavorites !== undefined) {
      // User has customized favorites - use only their list
      return new Set(userFavorites);
    }
    // No customization yet - use defaults
    return new Set<string>([...OPENROUTER_FAVORITE_MODELS]);
  }, [userFavorites]);

  // Filter models based on search query
  const filteredModels = useMemo(() => {
    if (!searchQuery.trim()) {
      return models;
    }
    const query = searchQuery.toLowerCase();
    return models.filter(
      (m) =>
        m.name.toLowerCase().includes(query) ||
        m.id.toLowerCase().includes(query),
    );
  }, [models, searchQuery]);

  // Split into favorites and non-favorites
  const favoriteModels = useMemo(() => {
    return filteredModels.filter((m) => allFavoriteIds.has(m.id));
  }, [filteredModels, allFavoriteIds]);

  const otherModels = useMemo(() => {
    return filteredModels.filter((m) => !allFavoriteIds.has(m.id));
  }, [filteredModels, allFavoriteIds]);

  // Get selected model name for collapsed display
  const selectedModelData = useMemo(() => {
    return models.find((m) => m.id === selectedModel);
  }, [models, selectedModel]);

  // Load models when expanded for the first time
  useEffect(() => {
    if (expanded && modelsStatus === "idle") {
      void loadOpenRouterModels();
    }
  }, [expanded, modelsStatus]);

  const handleExpand = useCallback(() => {
    if (!disabled) {
      setExpanded(true);
    }
  }, [disabled]);

  const handleCollapse = useCallback(() => {
    setExpanded(false);
    setOpenRouterSearchQuery("");
  }, []);

  const handleModelSelect = useCallback(
    (modelId: string) => {
      onModelSelect(modelId);
      handleCollapse();
    },
    [onModelSelect, handleCollapse],
  );

  const handleToggleFavorite = useCallback(
    (modelId: string) => {
      void toggleOpenRouterFavoriteModel(apiKeyId, modelId);
    },
    [apiKeyId],
  );

  const handleSearchChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      setOpenRouterSearchQuery(event.target.value);
    },
    [],
  );

  // Collapsed state - looks like a Select
  if (!expanded) {
    return (
      <Paper
        variant="outlined"
        onClick={handleExpand}
        sx={{
          px: 1.5,
          py: 1,
          cursor: disabled ? "default" : "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          opacity: disabled ? 0.5 : 1,
          "&:hover": {
            borderColor: disabled ? "divider" : "action.active",
          },
        }}
      >
        <Box sx={{ minWidth: 0, flex: 1 }}>
          <Typography variant="caption" color="text.secondary">
            <FormattedMessage defaultMessage="Model" />
          </Typography>
          <Typography variant="body2" noWrap>
            {selectedModelData?.name ?? selectedModel ?? (
              <FormattedMessage defaultMessage="Select a model" />
            )}
          </Typography>
        </Box>
        <ExpandMoreIcon color="action" />
      </Paper>
    );
  }

  // Expanded state - search + list
  return (
    <Paper
      variant="outlined"
      sx={{
        overflow: "hidden",
      }}
    >
      {/* Header with search */}
      <Box sx={{ p: 1.5, borderBottom: 1, borderColor: "divider" }}>
        <TextField
          fullWidth
          size="small"
          placeholder="Search models..."
          value={searchQuery}
          onChange={handleSearchChange}
          autoFocus
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon fontSize="small" color="action" />
              </InputAdornment>
            ),
            endAdornment: (
              <InputAdornment position="end">
                <IconButton size="small" onClick={handleCollapse} edge="end">
                  <CloseIcon fontSize="small" />
                </IconButton>
              </InputAdornment>
            ),
          }}
        />
      </Box>

      {/* Loading state */}
      {modelsStatus === "loading" && (
        <Stack spacing={1} alignItems="center" sx={{ py: 4 }}>
          <CircularProgress size={24} />
          <Typography variant="body2" color="text.secondary">
            <FormattedMessage defaultMessage="Loading models..." />
          </Typography>
        </Stack>
      )}

      {/* Error state */}
      {modelsStatus === "error" && (
        <Stack spacing={1} alignItems="center" sx={{ py: 4 }}>
          <Typography variant="body2" color="error">
            <FormattedMessage defaultMessage="Failed to load models" />
          </Typography>
        </Stack>
      )}

      {/* Models list */}
      {modelsStatus === "success" && (
        <Box
          sx={{
            display: "flex",
            flexDirection: "column",
            height: 320,
            overflow: "hidden",
          }}
        >
          {/* Favorites section - scrollable if too many */}
          {favoriteModels.length > 0 && (
            <Box sx={{ flexShrink: 0, maxHeight: 160, display: "flex", flexDirection: "column" }}>
              <Box sx={{ px: 1.5, pt: 1.5, pb: 0.5, flexShrink: 0 }}>
                <Typography
                  variant="caption"
                  color="text.secondary"
                  fontWeight={600}
                >
                  <FormattedMessage defaultMessage="Favorites" />
                  <Typography
                    component="span"
                    variant="caption"
                    color="text.secondary"
                    sx={{ ml: 0.5 }}
                  >
                    ({favoriteModels.length})
                  </Typography>
                </Typography>
              </Box>
              <Box sx={{ overflow: "auto", flex: 1, minHeight: 0 }}>
                {favoriteModels.map((model) => (
                  <ModelRow
                    key={model.id}
                    model={model}
                    selected={selectedModel === model.id}
                    isFavorite={true}
                    onSelect={() => handleModelSelect(model.id)}
                    onToggleFavorite={() => handleToggleFavorite(model.id)}
                  />
                ))}
              </Box>
              <Divider sx={{ mt: 1, flexShrink: 0 }} />
            </Box>
          )}

          {/* All models section - fills remaining space */}
          <Box
            sx={{
              flex: 1,
              minHeight: 0,
              display: "flex",
              flexDirection: "column",
              overflow: "hidden",
            }}
          >
            <Box sx={{ px: 1.5, pt: favoriteModels.length > 0 ? 0.5 : 1.5, pb: 0.5, flexShrink: 0 }}>
              <Typography
                variant="caption"
                color="text.secondary"
                fontWeight={600}
              >
                <FormattedMessage defaultMessage="All Models" />
                {filteredModels.length > 0 && (
                  <Typography
                    component="span"
                    variant="caption"
                    color="text.secondary"
                    sx={{ ml: 0.5 }}
                  >
                    ({otherModels.length})
                  </Typography>
                )}
              </Typography>
            </Box>
            {otherModels.length > 0 ? (
              <Box sx={{ flex: 1, minHeight: 0 }}>
                <Virtuoso
                  style={{ height: "100%" }}
                  data={otherModels}
                  itemContent={(_index, model) => (
                    <ModelRow
                      model={model}
                      selected={selectedModel === model.id}
                      isFavorite={allFavoriteIds.has(model.id)}
                      onSelect={() => handleModelSelect(model.id)}
                      onToggleFavorite={() => handleToggleFavorite(model.id)}
                    />
                  )}
                />
              </Box>
            ) : (
              <Box sx={{ px: 1.5, py: 2 }}>
                <Typography variant="body2" color="text.secondary">
                  <FormattedMessage defaultMessage="No models found" />
                </Typography>
              </Box>
            )}
          </Box>
        </Box>
      )}
    </Paper>
  );
};
