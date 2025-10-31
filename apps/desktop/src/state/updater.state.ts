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
  downloadedBytes: number | null;
  totalBytes: number | null;
  downloadProgress: number | null;
  errorMessage: string | null;
};

export const INITIAL_UPDATER_STATE: UpdaterState = {
  dialogOpen: false,
  status: "idle",
  lastUpdateVersion: null,
  currentVersion: null,
  availableVersion: null,
  releaseDate: null,
  releaseNotes: null,
  downloadedBytes: null,
  totalBytes: null,
  downloadProgress: null,
  errorMessage: null,
};
