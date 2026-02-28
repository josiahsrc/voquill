export type UpdaterStatus =
  | "idle"
  | "checking"
  | "ready"
  | "downloading"
  | "installing"
  | "error";

export type UpdaterState = {
  dialogOpen: boolean;
  status: UpdaterStatus;
  lastUpdateVersion: string | null;
  currentVersion: string | null;
  availableVersion: string | null;
  releaseDate: string | null;
  releaseNotes: string | null;
  manualInstallerUrl: string | null;
  downloadedBytes: number | null;
  totalBytes: number | null;
  downloadProgress: number | null;
  errorMessage: string | null;
  dismissedUntil: number | null;
};

export const INITIAL_UPDATER_STATE: UpdaterState = {
  dialogOpen: false,
  status: "idle",
  lastUpdateVersion: null,
  currentVersion: null,
  availableVersion: null,
  releaseDate: null,
  releaseNotes: null,
  manualInstallerUrl: null,
  downloadedBytes: null,
  totalBytes: null,
  downloadProgress: null,
  errorMessage: null,
  dismissedUntil: null,
};
