import KeyIcon from "@mui/icons-material/Key";
import AddIcon from "@mui/icons-material/Add";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import ErrorIcon from "@mui/icons-material/Error";
import {
  Box,
  Button,
  Paper,
  Stack,
  Tab,
  Tabs,
  Typography,
  Radio,
  FormControlLabel,
  FormControl,
  FormLabel,
  RadioGroup,
  TextField,
  MenuItem,
  CircularProgress,
} from "@mui/material";
import { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import { DashboardEntryLayout } from "../dashboard/DashboardEntryLayout";

type ApiKey = {
  id: string;
  name: string;
  provider: "groq";
  key: string;
};

type GpuInfo = {
  name: string;
  vendor: number;
  device: number;
  deviceType: string;
  backend: string;
};

type GpuTestStatus = "idle" | "testing" | "success" | "failed";

// Shared styles
const SELECTED_BORDER_COLOR = "primary.main";
const CARD_TRANSITION = "all 0.2s ease";

const selectedCardSx = {
  borderWidth: 2,
  borderColor: SELECTED_BORDER_COLOR,
  transform: "translateY(-2px)",
  boxShadow: (theme: any) => 
    `0 0 0 3px ${theme.palette.primary.main}33, 0 4px 12px rgba(0, 0, 0, 0.15)`,
};

const SelectionRibbon = () => (
  <Box
    sx={{
      position: "absolute",
      top: 16,
      right: -35,
      width: 100,
      height: 4,
      background: (theme) => 
        `linear-gradient(135deg, ${theme.palette.primary.light} 0%, ${theme.palette.primary.main} 100%)`,
      transform: "rotate(45deg)",
      boxShadow: (theme) => 
        `0 2px 12px ${theme.palette.primary.main}66, 0 0 20px ${theme.palette.primary.light}4D`,
    }}
  />
);

const SelectButton = ({ onClick }: { onClick: () => void }) => (
  <Box sx={{ display: "flex", justifyContent: "flex-end", mt: 2 }}>
    <Button
      variant="text"
      onClick={onClick}
      sx={{
        textTransform: "none",
        fontWeight: 600,
      }}
    >
      Select
    </Button>
  </Box>
);

type EmptyStateProps = {
  icon: React.ReactNode;
  title: string;
  description: string;
  actionLabel: string;
  onAction: () => void;
};

const EmptyState = ({ icon, title, description, actionLabel, onAction }: EmptyStateProps) => (
  <Box
    sx={{
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      py: 8,
      px: 3,
    }}
  >
    {icon}
    <Typography variant="h6" fontWeight={600} color="text.secondary" sx={{ mb: 1 }}>
      {title}
    </Typography>
    <Typography
      variant="body2"
      color="text.secondary"
      sx={{ mb: 3, textAlign: "center", maxWidth: 400 }}
    >
      {description}
    </Typography>
    <Button
      variant="contained"
      startIcon={<AddIcon />}
      onClick={onAction}
      sx={{ textTransform: "none", fontWeight: 600 }}
    >
      {actionLabel}
    </Button>
  </Box>
);

type AddApiKeyCardProps = {
  onSave: (name: string, provider: "groq", key: string) => void;
  onCancel: () => void;
};

const AddApiKeyCard = ({ onSave, onCancel }: AddApiKeyCardProps) => {
  const [name, setName] = useState("");
  const [provider, setProvider] = useState<"groq">("groq");
  const [key, setKey] = useState("");

  const handleSave = () => {
    if (name && key) {
      onSave(name, provider, key);
    }
  };

  return (
    <Paper variant="outlined" sx={{ p: 3, borderRadius: 2 }}>
      <Stack spacing={2.5}>
        <TextField
          label="Key Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          fullWidth
          placeholder="e.g., My Groq Key"
          size="small"
        />
        <TextField
          select
          label="Provider"
          value={provider}
          onChange={(e) => setProvider(e.target.value as "groq")}
          fullWidth
          size="small"
        >
          <MenuItem value="groq">Groq</MenuItem>
        </TextField>
        <TextField
          label="API Key"
          value={key}
          onChange={(e) => setKey(e.target.value)}
          fullWidth
          type="password"
          placeholder="Enter your API key"
          size="small"
        />
        <Box sx={{ display: "flex", gap: 1.5, justifyContent: "flex-end" }}>
          <Button onClick={onCancel} variant="outlined" sx={{ textTransform: "none", fontWeight: 600 }}>
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            variant="contained"
            disabled={!name || !key}
            sx={{ textTransform: "none", fontWeight: 600 }}
          >
            Save
          </Button>
        </Box>
      </Stack>
    </Paper>
  );
};

type ApiKeyCardProps = {
  name: string;
  provider: string;
  selected: boolean;
  onClick: () => void;
};

const ApiKeyCard = ({ name, provider, selected, onClick }: ApiKeyCardProps) => {
  return (
    <Paper
      variant="outlined"
      sx={{
        p: 3,
        borderRadius: 2,
        position: "relative",
        overflow: "hidden",
        borderWidth: selected ? 2 : 1,
        borderColor: selected ? SELECTED_BORDER_COLOR : "divider",
        transition: CARD_TRANSITION,
        ...(selected && selectedCardSx),
        "&:hover": {
          borderColor: "primary.main",
          bgcolor: "action.hover",
        },
      }}
    >
      {selected && <SelectionRibbon />}
      <Box sx={{ display: "flex", alignItems: "center", gap: 2, mb: 2 }}>
        <Box sx={{ flex: 1 }}>
          <Typography variant="h6" fontWeight={700}>
            {name}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {provider}
          </Typography>
        </Box>
      </Box>
      {!selected && <SelectButton onClick={onClick} />}
    </Paper>
  );
};

type GpuWithStatus = {
  info: GpuInfo;
  status: GpuTestStatus;
  transcript?: string;
  error?: string;
};

type LocalProcessingCardProps = {
  title: string;
  selected: boolean;
  onClick: () => void;
  modelSize: string;
  onModelSizeChange: (size: string) => void;
};

const GPU_TEST_SAMPLE_RATE = 16_000;
const GPU_TEST_SAMPLES = Array.from({ length: GPU_TEST_SAMPLE_RATE / 10 }, () => 0);

const LocalProcessingCard = ({
  title,
  selected,
  onClick,
  modelSize,
  onModelSizeChange,
}: LocalProcessingCardProps) => {
  const [gpus, setGpus] = useState<GpuWithStatus[]>([]);
  const [selectedGpuIndex, setSelectedGpuIndex] = useState<number | null>(null);
  const [loadingGpus, setLoadingGpus] = useState(true);
  const [useCpu, setUseCpu] = useState(true);

  useEffect(() => {
    const loadGpus = async () => {
      try {
        const gpuList = await invoke<GpuInfo[]>("list_gpus");
        const supportedGpus = gpuList.filter(
          (info) =>
            info.backend === "Vulkan" && info.deviceType === "DiscreteGpu"
        );
        setGpus(supportedGpus.map((info) => ({ info, status: "idle" })));
      } catch (error) {
        console.error("Failed to load GPUs:", error);
        setGpus([]);
      } finally {
        setLoadingGpus(false);
      }
    };

    loadGpus();
  }, []);

  const handleSelectCpu = () => {
    setUseCpu(true);
    setSelectedGpuIndex(null);
  };

  const handleSelectGpu = (index: number) => {
    setUseCpu(false);
    setSelectedGpuIndex(index);
  };

  const handleTestGpu = async (index: number) => {
    const targetGpu = gpus[index];
    if (!targetGpu) {
      return;
    }

    setGpus((prev) =>
      prev.map((gpu, i) =>
        i === index
          ? { ...gpu, status: "testing", error: undefined, transcript: undefined }
          : gpu
      )
    );

    try {
      const transcript = await invoke<string>("transcribe_audio", {
        samples: GPU_TEST_SAMPLES,
        sampleRate: GPU_TEST_SAMPLE_RATE,
        device: { deviceName: targetGpu.info.name },
      });

      const normalized = (transcript ?? "").trim();
      const truncated =
        normalized.length > 80 ? `${normalized.slice(0, 80)}…` : normalized;

      setGpus((prev) =>
        prev.map((gpu, i) =>
          i === index
            ? {
                ...gpu,
                status: "success",
                transcript: truncated,
                error: undefined,
              }
            : gpu
        )
      );
    } catch (error) {
      console.error("GPU test failed:", error);
      const message =
        error instanceof Error
          ? error.message
          : typeof error === "string"
          ? error
          : "Transcription test failed";

      setGpus((prev) =>
        prev.map((gpu, i) =>
          i === index
            ? {
                ...gpu,
                status: "failed",
                error: message,
                transcript: undefined,
              }
            : gpu
        )
      );
    }
  };

  const getStatusIcon = (status: GpuTestStatus) => {
    switch (status) {
      case "testing":
        return <CircularProgress size={20} />;
      case "success":
        return <CheckCircleIcon sx={{ color: "success.main" }} />;
      case "failed":
        return <ErrorIcon sx={{ color: "error.main" }} />;
      default:
        return null;
    }
  };

  const getStatusText = (gpu: GpuWithStatus) => {
    switch (gpu.status) {
      case "testing":
        return "Testing...";
      case "success":
        return gpu.transcript
          ? `Test passed — transcript: "${gpu.transcript}"`
          : "Test passed";
      case "failed":
        return gpu.error || "Test failed";
      default:
        return "";
    }
  };

  return (
    <Paper
      variant="outlined"
      sx={{
        p: 3,
        borderRadius: 2,
        position: "relative",
        overflow: "hidden",
        borderWidth: selected ? 2 : 1,
        borderColor: selected ? SELECTED_BORDER_COLOR : "divider",
        transition: CARD_TRANSITION,
        ...(selected && selectedCardSx),
        "&:hover": {
          borderColor: "primary.main",
        },
      }}
    >
      {selected && <SelectionRibbon />}
      <Box sx={{ mb: 3 }}>
        <Typography variant="h6" fontWeight={700}>
          {title}
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
          Process locally on your device with maximum privacy and control
        </Typography>
      </Box>

      <Stack spacing={2.5} sx={{ mb: 3 }}>
        <FormControl>
          <FormLabel sx={{ mb: 1.5, fontSize: "0.875rem", fontWeight: 500 }}>
            Processing Device
          </FormLabel>
          {loadingGpus ? (
            <Box sx={{ display: "flex", alignItems: "center", gap: 1, py: 2 }}>
              <CircularProgress size={20} />
              <Typography variant="body2" color="text.secondary">
                Detecting GPUs...
              </Typography>
            </Box>
          ) : (
            <Stack spacing={1.5}>
              {/* CPU Option */}
              <Paper
                variant="outlined"
                sx={{
                  p: 2,
                  borderColor: useCpu ? "primary.main" : "divider",
                  bgcolor: useCpu ? "action.selected" : "background.paper",
                  cursor: "pointer",
                  transition: "all 0.2s ease",
                  "&:hover": {
                    borderColor: "primary.main",
                    bgcolor: useCpu ? "action.selected" : "action.hover",
                  },
                }}
                onClick={handleSelectCpu}
              >
                <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                  <Box sx={{ flex: 1 }}>
                    <Typography variant="body2" fontWeight={600}>
                      CPU Processing
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Use CPU for audio processing {gpus.length === 0 ? "(default)" : ""}
                    </Typography>
                  </Box>
                  {useCpu && (
                    <CheckCircleIcon sx={{ color: "primary.main" }} />
                  )}
                </Box>
              </Paper>

              {/* GPU Options */}
              {gpus.length > 0 && (
                <>
                  {gpus.map((gpu, index) => (
                    <Paper
                      key={index}
                      variant="outlined"
                      sx={{
                        p: 2,
                        borderColor:
                          selectedGpuIndex === index && !useCpu
                            ? "primary.main"
                            : "divider",
                        bgcolor:
                          selectedGpuIndex === index && !useCpu
                            ? "action.selected"
                            : "background.paper",
                      }}
                    >
                      <Box sx={{ display: "flex", alignItems: "flex-start", gap: 2 }}>
                        <Box sx={{ flex: 1 }}>
                          <Typography variant="body2" fontWeight={600}>
                            {gpu.info.name}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {gpu.info.backend} • {gpu.info.deviceType}
                          </Typography>
                          {gpu.status !== "idle" && (
                            <Box
                              sx={{
                                display: "flex",
                                alignItems: "center",
                                gap: 1,
                                mt: 1,
                              }}
                            >
                              {getStatusIcon(gpu.status)}
                              <Box sx={{ display: "flex", flexDirection: "column", gap: 0.5 }}>
                                <Typography
                                  variant="caption"
                                  color={
                                    gpu.status === "success"
                                      ? "success.main"
                                      : gpu.status === "failed"
                                      ? "error.main"
                                      : "text.secondary"
                                  }
                                >
                                  {getStatusText(gpu)}
                                </Typography>
                                {gpu.status === "success" && !gpu.transcript && (
                                  <Typography variant="caption" color="text.secondary">
                                    Transcript was empty (silence detected).
                                  </Typography>
                                )}
                              </Box>
                            </Box>
                          )}
                        </Box>
                        <Box sx={{ display: "flex", gap: 1, alignItems: "center" }}>
                          {selectedGpuIndex === index && !useCpu && (
                            <CheckCircleIcon sx={{ color: "primary.main" }} />
                          )}
                          {gpu.status === "success" ? (
                            <Button
                              size="small"
                              variant={selectedGpuIndex === index && !useCpu ? "contained" : "outlined"}
                              onClick={() => handleSelectGpu(index)}
                              sx={{ textTransform: "none", fontWeight: 600 }}
                            >
                              {selectedGpuIndex === index && !useCpu ? "Selected" : "Select"}
                            </Button>
                          ) : (
                            <Button
                              size="small"
                              variant="outlined"
                              onClick={() => handleTestGpu(index)}
                              disabled={gpu.status === "testing"}
                              sx={{ textTransform: "none", fontWeight: 600 }}
                            >
                              {gpu.status === "idle"
                                ? "Test"
                                : gpu.status === "failed"
                                ? "Retry"
                                : "Testing..."}
                            </Button>
                          )}
                        </Box>
                      </Box>
                    </Paper>
                  ))}
                  <Typography variant="caption" color="text.secondary" sx={{ pt: 1 }}>
                    Test a GPU to verify compatibility, then select it to use for processing
                  </Typography>
                </>
              )}
            </Stack>
          )}
        </FormControl>

        <FormControl>
          <FormLabel sx={{ mb: 1, fontSize: "0.875rem", fontWeight: 500 }}>
            Model Size
          </FormLabel>
          <RadioGroup
            value={modelSize}
            onChange={(e) => onModelSizeChange(e.target.value)}
          >
            <FormControlLabel
              value="small"
              control={<Radio onClick={(e) => e.stopPropagation()} />}
              label={
                <Box>
                  <Typography variant="body2">Small (~400 MB)</Typography>
                  <Typography variant="caption" color="text.secondary">
                    Faster processing, lower accuracy
                  </Typography>
                </Box>
              }
            />
            <FormControlLabel
              value="medium"
              control={<Radio onClick={(e) => e.stopPropagation()} />}
              label={
                <Box>
                  <Typography variant="body2">Medium (~1 GB)</Typography>
                  <Typography variant="caption" color="text.secondary">
                    Balanced speed and accuracy
                  </Typography>
                </Box>
              }
            />
            <FormControlLabel
              value="large"
              control={<Radio onClick={(e) => e.stopPropagation()} />}
              label={
                <Box>
                  <Typography variant="body2">Large (~3 GB)</Typography>
                  <Typography variant="caption" color="text.secondary">
                    Best accuracy, slower processing
                  </Typography>
                </Box>
              }
            />
          </RadioGroup>
        </FormControl>
      </Stack>

      {!selected && <SelectButton onClick={onClick} />}
    </Paper>
  );
};

const tabSx = {
  textTransform: "none",
  minHeight: "unset",
  py: 1.25,
  px: 2.5,
  borderRadius: 1.5,
  fontWeight: 600,
  transition: "all 0.2s ease",
  color: "text.secondary",
  "&.Mui-selected": {
    color: "text.primary",
    bgcolor: "background.paper",
    boxShadow: "inset 0 1px 3px rgba(0,0,0,0.2), 0 1px 2px rgba(0,0,0,0.05)",
  },
  "&:hover:not(.Mui-selected)": {
    color: "text.primary",
    bgcolor: "rgba(255,255,255,0.05)",
  },
};

const PlansPage = () => {
  const [selectedTab, setSelectedTab] = useState(0);
  const [localProcessingSelected, setLocalProcessingSelected] = useState(true);
  const [modelSize, setModelSize] = useState("medium");
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [selectedApiKeyId, setSelectedApiKeyId] = useState<string | null>(null);
  const [showAddApiKeyCard, setShowAddApiKeyCard] = useState(false);

  const handleSaveApiKey = (name: string, provider: "groq", key: string) => {
    const newKey: ApiKey = {
      id: Date.now().toString(),
      name,
      provider,
      key,
    };
    setApiKeys([...apiKeys, newKey]);
    setSelectedApiKeyId(newKey.id);
    setShowAddApiKeyCard(false);
  };

  const handleCancelAddApiKey = () => {
    setShowAddApiKeyCard(false);
  };

  return (
    <DashboardEntryLayout maxWidth="lg">
      <Stack spacing={2} sx={{ mb: 4 }}>
        <Typography variant="h4" fontWeight={700}>
          Choose Your Processing Mode
        </Typography>
        <Typography
          variant="body1"
          color="text.secondary"
          sx={{ maxWidth: 640 }}
        >
          Voquill can process your audio locally or via an API.
        </Typography>
      </Stack>

      <Box
        sx={{
          display: "inline-flex",
          bgcolor: "action.hover",
          borderRadius: 2,
          p: 0.5,
          border: 1,
          borderColor: "divider",
          maxWidth: "fit-content"
        }}
      >
        <Tabs
          value={selectedTab}
          onChange={(_, newValue) => setSelectedTab(newValue)}
          aria-label="processing mode tabs"
          sx={{
            minHeight: "unset",
            "& .MuiTabs-indicator": {
              display: "none",
            },
          }}
        >
          <Tab label="Local Processing" sx={tabSx} />
          <Tab label="API Key" sx={tabSx} />
        </Tabs>
      </Box>

      <Box sx={{ py: 2 }}>
        {selectedTab === 0 && (
          <Box sx={{ maxWidth: 600 }}>
            <LocalProcessingCard
              title="Local Processing"
              selected={localProcessingSelected}
              onClick={() => setLocalProcessingSelected(true)}
              modelSize={modelSize}
              onModelSizeChange={setModelSize}
            />
          </Box>
        )}
        {selectedTab === 1 && (
          <Box sx={{ maxWidth: 600 }}>
            {apiKeys.length === 0 && !showAddApiKeyCard ? (
              <EmptyState
                icon={
                  <KeyIcon
                    sx={{
                      fontSize: 64,
                      color: "text.secondary",
                      mb: 2,
                    }}
                  />
                }
                title="No API Keys Found"
                description="Add an API key to connect to third-party services like Groq for transcription processing."
                actionLabel="Add API Key"
                onAction={() => setShowAddApiKeyCard(true)}
              />
            ) : (
              <Stack spacing={2}>
                {apiKeys.map((apiKey) => (
                  <ApiKeyCard
                    key={apiKey.id}
                    name={apiKey.name}
                    provider={apiKey.provider}
                    selected={selectedApiKeyId === apiKey.id}
                    onClick={() => setSelectedApiKeyId(apiKey.id)}
                  />
                ))}
                {showAddApiKeyCard && (
                  <AddApiKeyCard
                    onSave={handleSaveApiKey}
                    onCancel={handleCancelAddApiKey}
                  />
                )}
                {!showAddApiKeyCard && (
                  <Button
                    variant="outlined"
                    startIcon={<AddIcon />}
                    onClick={() => setShowAddApiKeyCard(true)}
                    sx={{ textTransform: "none", fontWeight: 600 }}
                  >
                    Add Another Key
                  </Button>
                )}
              </Stack>
            )}
          </Box>
        )}
      </Box>
    </DashboardEntryLayout>
  );
};

export default PlansPage;
