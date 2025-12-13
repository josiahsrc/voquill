export type GpuInfo = {
  name: string;
  vendor: number;
  device: number;
  deviceType: string;
  backend: string;
};

export const buildDeviceLabel = (gpu: GpuInfo) =>
  `${gpu.name} (${gpu.backend})`;
