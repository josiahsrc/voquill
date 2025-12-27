import { invoke } from "@tauri-apps/api/core";
import { useEffect, useState } from "react";
import { type GpuInfo } from "../types/gpu.types";

export const useSupportedDiscreteGpus = (active: boolean) => {
  const [gpus, setGpus] = useState<GpuInfo[]>([]);
  const [loading, setLoading] = useState(() => active);

  useEffect(() => {
    if (!active) {
      setGpus([]);
      setLoading(false);
      return;
    }

    let cancelled = false;

    const loadGpus = async () => {
      setLoading(true);

      try {
        const gpuList = await invoke<GpuInfo[]>("list_gpus");
        console.log("[gpu] Raw GPU list:", gpuList);
        const supported = gpuList.filter(
          (info) =>
            info.backend === "Vulkan" && info.deviceType === "DiscreteGpu",
        );
        console.log("[gpu] Filtered GPUs:", supported);
        if (!cancelled) {
          setGpus(supported);
        }
      } catch (error) {
        console.error("Failed to load GPUs:", error);
        if (!cancelled) {
          setGpus([]);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void loadGpus();

    return () => {
      cancelled = true;
    };
  }, [active]);

  return { gpus, loading };
};
