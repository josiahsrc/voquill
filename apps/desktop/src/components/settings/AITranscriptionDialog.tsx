import CloseIcon from "@mui/icons-material/Close";
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  IconButton,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  Typography,
} from "@mui/material";
import { invoke } from "@tauri-apps/api/core";
import { useCallback, useEffect, useMemo, useState } from "react";
import { produceAppState, useAppStore } from "../../store";
import { SegmentedControl } from "../common/SegmentedControl";
import { ApiKeyList } from "./ApiKeyList";

type GpuInfo = {
  name: string;
  vendor: number;
  device: number;
  deviceType: string;
  backend: string;
};

type ProcessingMode = "local" | "api";

const MODEL_OPTIONS = [
  { value: "tiny", label: "Tiny (77 MB)", helper: "Fastest, lowest accuracy" },
  {
    value: "base",
    label: "Base (148 MB)",
    helper: "Great balance of speed and accuracy",
  },
  {
    value: "small",
    label: "Small (488 MB)",
    helper: "Recommended with GPU acceleration",
  },
  {
    value: "medium",
    label: "Medium (1.53 GB)",
    helper: "Highest accuracy, slower on CPU",
  },
];

const buildDeviceLabel = (gpu: GpuInfo) => `${gpu.name} (${gpu.backend})`;

export const AITranscriptionDialog = () => {
  const open = useAppStore((state) => state.settings.aiTranscriptionDialogOpen);
  const [mode, setMode] = useState<ProcessingMode>("local");
  const [modelSize, setModelSize] = useState("base");
  const [selectedApiKeyId, setSelectedApiKeyId] = useState<string | null>(null);
  const [gpus, setGpus] = useState<GpuInfo[]>([]);
  const [selectedDevice, setSelectedDevice] = useState<string>("cpu");

  useEffect(() => {
    if (!open) {
      return;
    }

    const loadGpus = async () => {
      try {
        const gpuList = await invoke<GpuInfo[]>("list_gpus");
        const supported = gpuList.filter(
          (info) =>
            info.backend === "Vulkan" && info.deviceType === "DiscreteGpu"
        );
        setGpus(supported);
        if (supported.length === 0) {
          setSelectedDevice("cpu");
        }
      } catch (error) {
        console.error("Failed to load GPUs:", error);
        setGpus([]);
        setSelectedDevice("cpu");
      }
    };

    loadGpus();
  }, [open]);

  useEffect(() => {
    if (!open) {
      setMode("local");
      setModelSize("base");
      setSelectedDevice("cpu");
      setSelectedApiKeyId(null);
    }
  }, [open]);

  const deviceOptions = useMemo(
    () => [
      { value: "cpu", label: "CPU processing" },
      ...gpus.map((gpu, index) => ({
        value: `gpu-${index}`,
        label: buildDeviceLabel(gpu),
      })),
    ],
    [gpus]
  );

  const closeDialog = () => {
    produceAppState((draft) => {
      draft.settings.aiTranscriptionDialogOpen = false;
    });
  };

  const handleModeChange = useCallback((value: ProcessingMode) => {
    setMode(value);
  }, []);

  const handleSelectedApiKeyChange = useCallback((id: string | null) => {
    setSelectedApiKeyId(id);
  }, []);

  const localProcessingView = (
    <Stack spacing={3}>
      <FormControl fullWidth size="small">
        <InputLabel id="processing-device-label">Processing device</InputLabel>
        <Select
          labelId="processing-device-label"
          label="Processing device"
          value={selectedDevice}
          onChange={(event) => setSelectedDevice(event.target.value)}
        >
          {deviceOptions.map(({ value, label }) => (
            <MenuItem key={value} value={value}>
              {label}
            </MenuItem>
          ))}
        </Select>
      </FormControl>

      <FormControl fullWidth size="small">
        <InputLabel id="model-size-label">Model size</InputLabel>
        <Select
          labelId="model-size-label"
          label="Model size"
          value={modelSize}
          onChange={(event) => setModelSize(event.target.value)}
        >
          {MODEL_OPTIONS.map(({ value, label, helper }) => (
            <MenuItem key={value} value={value}>
              <Box>
                <Typography variant="body2" fontWeight={600}>
                  {label}
                </Typography>
                <Typography
                  variant="caption"
                  color="text.secondary"
                  display="block"
                >
                  {helper}
                </Typography>
              </Box>
            </MenuItem>
          ))}
        </Select>
      </FormControl>
    </Stack>
  );

  const apiKeyView = (
    <ApiKeyList
      selectedApiKeyId={selectedApiKeyId}
      onChange={handleSelectedApiKeyChange}
    />
  );

  return (
    <Dialog open={open} onClose={closeDialog} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ display: "flex", alignItems: "center" }}>
        AI transcription
        <IconButton
          aria-label="Close"
          onClick={closeDialog}
          size="small"
          sx={{ ml: "auto" }}
        >
          <CloseIcon fontSize="small" />
        </IconButton>
      </DialogTitle>
      <DialogContent dividers>
        <Stack spacing={3} alignItems="flex-start">
          <Typography variant="body1" color="text.secondary">
            Decide how Voquill should transcribe your recordings—locally on your
            machine or through a connected provider.
          </Typography>

          <SegmentedControl<ProcessingMode>
            value={mode}
            onChange={handleModeChange}
            options={[
              { value: "local", label: "Local processing" },
              { value: "api", label: "API key" },
            ]}
            ariaLabel="Processing mode"
          />

          {mode === "local" ? localProcessingView : apiKeyView}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={closeDialog}>Done</Button>
      </DialogActions>
    </Dialog>
  );
};
