import { invoke } from "@tauri-apps/api/core";
import { getAppState } from "../store";
import { CPU_DEVICE_VALUE, DEFAULT_MODEL_SIZE } from "../types/ai.types";
import type { GpuInfo } from "../types/gpu.types";
import { buildDeviceLabel } from "../types/gpu.types";

type TranscriptionDeviceSelection = {
  cpu?: boolean;
  deviceId?: number;
  deviceName?: string;
};

export type TranscriptionOptionsPayload = {
  modelSize: string;
  device?: TranscriptionDeviceSelection;
  deviceLabel: string;
};

let cachedDiscreteGpus: GpuInfo[] | null = null;
let loadingDiscreteGpus: Promise<GpuInfo[]> | null = null;

const filterDiscreteGpus = (gpu: GpuInfo) =>
  gpu.backend === "Vulkan" && gpu.deviceType === "DiscreteGpu";

const loadDiscreteGpus = async (): Promise<GpuInfo[]> => {
  if (cachedDiscreteGpus) {
    return cachedDiscreteGpus;
  }

  if (!loadingDiscreteGpus) {
    loadingDiscreteGpus = invoke<GpuInfo[]>("list_gpus")
      .then((gpuList) => {
        const discrete = gpuList.filter(filterDiscreteGpus);
        cachedDiscreteGpus = discrete;
        return discrete;
      })
      .catch((error) => {
        console.error("Failed to load GPU descriptors", error);
        cachedDiscreteGpus = [];
        return [];
      })
      .finally(() => {
        loadingDiscreteGpus = null;
      });
  }

  return loadingDiscreteGpus;
};

export const resolveTranscriptionOptions =
  async (): Promise<TranscriptionOptionsPayload> => {
    const state = getAppState();
    const { device, modelSize } = state.settings.aiTranscription;

    const normalizedModelSize =
      modelSize?.trim().toLowerCase() || DEFAULT_MODEL_SIZE;

    const options: TranscriptionOptionsPayload = {
      modelSize: normalizedModelSize,
      deviceLabel: "CPU",
    };

    const ensureCpu = () => {
      options.device = { cpu: true };
      options.deviceLabel = "CPU";
      return options;
    };

    if (!device || device === CPU_DEVICE_VALUE) {
      return ensureCpu();
    }

    const match = /^gpu-(\d+)$/.exec(device);
    if (!match) {
      return ensureCpu();
    }

    const index = Number.parseInt(match[1] ?? "", 10);
    if (Number.isNaN(index)) {
      return ensureCpu();
    }

    const gpus = await loadDiscreteGpus();
    const selected = gpus[index];

    if (!selected) {
      return ensureCpu();
    }

    options.device = {
      cpu: false,
      deviceId: selected.device,
      deviceName: selected.name,
    };
    options.deviceLabel = `GPU · ${buildDeviceLabel(selected)}`;

    return options;
  };
