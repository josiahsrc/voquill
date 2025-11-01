import { invoke } from "@tauri-apps/api/core";
import { GpuInfo } from "../types/gpu.types";

let cachedDiscreteGpus: GpuInfo[] | null = null;
let loadingDiscreteGpus: Promise<GpuInfo[]> | null = null;

const filterDiscreteGpus = (gpu: GpuInfo) =>
  gpu.backend === "Vulkan" && gpu.deviceType === "DiscreteGpu";

export const loadDiscreteGpus = async (): Promise<GpuInfo[]> => {
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
