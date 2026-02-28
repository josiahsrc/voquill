import type { AppState } from "../state/app.state";
import {
  createEmptyLocalTranscriptionModelStatusMap,
  isLocalTranscriptionModelDownloadInProgress,
  type LocalTranscriptionModelStatusMap,
} from "../state/settings.state";
import { getAppState, produceAppState } from "../store";
import {
  getLocalTranscriptionSidecarManager,
  type LocalSidecarProcessor,
} from "../utils/local-transcription-sidecar.utils";
import {
  isGpuPreferredTranscriptionDevice,
  LOCAL_WHISPER_MODELS,
  type LocalWhisperModel,
  normalizeTranscriptionDevice,
  supportsGpuTranscriptionDevice,
} from "../utils/local-transcription.utils";
import { showErrorSnackbar } from "./app.actions";

const getPreferGpu = (state: AppState): boolean =>
  isGpuPreferredTranscriptionDevice(state.settings.aiTranscription.device);
const getProcessorId = (state: AppState): string =>
  normalizeTranscriptionDevice(state.settings.aiTranscription.device);

const mergeProcessors = (
  ...lists: LocalSidecarProcessor[][]
): LocalSidecarProcessor[] => {
  const merged = new Map<string, LocalSidecarProcessor>();
  for (const list of lists) {
    for (const processor of list) {
      merged.set(processor.id, processor);
    }
  }
  return Array.from(merged.values());
};

export const refreshLocalTranscriptionProcessors = async ({
  showErrors = true,
}: {
  showErrors?: boolean;
} = {}): Promise<LocalSidecarProcessor[] | null> => {
  const state = getAppState();
  if (state.settings.aiTranscription.mode !== "local") {
    return null;
  }

  const sidecarManager = getLocalTranscriptionSidecarManager();

  produceAppState((draft) => {
    draft.settings.aiTranscription.localModelManagement.processorsLoading = true;
  });

  try {
    const cpuProcessors = await sidecarManager.listProcessors({
      preferGpu: false,
    });
    let gpuProcessors: LocalSidecarProcessor[] = [];

    if (supportsGpuTranscriptionDevice()) {
      gpuProcessors = await sidecarManager
        .listProcessors({ preferGpu: true })
        .catch(() => []);
    }

    const availableProcessors = mergeProcessors(cpuProcessors, gpuProcessors);

    produceAppState((draft) => {
      draft.settings.aiTranscription.localModelManagement.availableProcessors =
        availableProcessors;
      draft.settings.aiTranscription.localModelManagement.processorsLoaded = true;
    });

    return availableProcessors;
  } catch (error) {
    produceAppState((draft) => {
      draft.settings.aiTranscription.localModelManagement.availableProcessors =
        [];
      draft.settings.aiTranscription.localModelManagement.processorsLoaded = false;
    });

    if (showErrors) {
      showErrorSnackbar(`Unable to load available processors: ${error}`);
    }
    return null;
  } finally {
    produceAppState((draft) => {
      draft.settings.aiTranscription.localModelManagement.processorsLoading = false;
    });
  }
};

export const refreshLocalTranscriptionModelStatuses = async ({
  showErrors = true,
}: {
  showErrors?: boolean;
} = {}): Promise<LocalTranscriptionModelStatusMap | null> => {
  const state = getAppState();
  if (state.settings.aiTranscription.mode !== "local") {
    return null;
  }

  const preferGpu = getPreferGpu(state);
  const processorId = getProcessorId(state);
  const sidecarManager = getLocalTranscriptionSidecarManager();

  produceAppState((draft) => {
    draft.settings.aiTranscription.localModelManagement.modelStatusesLoading = true;
  });

  try {
    const statuses = await sidecarManager.listModelStatuses({
      preferGpu,
      processorId,
      validate: true,
      models: LOCAL_WHISPER_MODELS,
    });

    produceAppState((draft) => {
      draft.settings.aiTranscription.localModelManagement.modelStatuses =
        statuses;
      draft.settings.aiTranscription.localModelManagement.modelStatusesLoaded = true;
    });

    return statuses;
  } catch (error) {
    produceAppState((draft) => {
      draft.settings.aiTranscription.localModelManagement.modelStatuses =
        createEmptyLocalTranscriptionModelStatusMap();
      draft.settings.aiTranscription.localModelManagement.modelStatusesLoaded = false;
    });

    if (showErrors) {
      showErrorSnackbar(`Unable to load local model status: ${error}`);
    }
    return null;
  } finally {
    produceAppState((draft) => {
      draft.settings.aiTranscription.localModelManagement.modelStatusesLoading = false;
    });
  }
};

export const downloadLocalTranscriptionModel = async (
  model: LocalWhisperModel,
): Promise<void> => {
  const state = getAppState();
  if (state.settings.aiTranscription.mode !== "local") {
    return;
  }

  const existingDownload =
    state.settings.aiTranscription.localModelManagement.modelDownloads[model];
  if (isLocalTranscriptionModelDownloadInProgress(existingDownload)) {
    return;
  }

  const sidecarManager = getLocalTranscriptionSidecarManager();
  const preferGpu = getPreferGpu(state);
  const processorId = getProcessorId(state);

  try {
    await sidecarManager.downloadModel({
      model,
      preferGpu,
      processorId,
      onProgress: (snapshot) => {
        produceAppState((draft) => {
          draft.settings.aiTranscription.localModelManagement.modelDownloads[
            model
          ] = snapshot;
        });
      },
    });
    await refreshLocalTranscriptionModelStatuses({ showErrors: false });
  } catch (error) {
    showErrorSnackbar(`Unable to download '${model}' model: ${error}`);
  } finally {
    produceAppState((draft) => {
      delete draft.settings.aiTranscription.localModelManagement.modelDownloads[
        model
      ];
    });
  }
};

export const deleteLocalTranscriptionModel = async (
  model: LocalWhisperModel,
): Promise<LocalTranscriptionModelStatusMap | null> => {
  const state = getAppState();
  if (state.settings.aiTranscription.mode !== "local") {
    return null;
  }

  if (state.settings.aiTranscription.localModelManagement.modelDeletes[model]) {
    return null;
  }

  const sidecarManager = getLocalTranscriptionSidecarManager();
  const preferGpu = getPreferGpu(state);
  const processorId = getProcessorId(state);

  produceAppState((draft) => {
    draft.settings.aiTranscription.localModelManagement.modelDeletes[model] =
      true;
  });

  try {
    await sidecarManager.deleteModel({ model, preferGpu, processorId });
    return await refreshLocalTranscriptionModelStatuses({ showErrors: false });
  } catch (error) {
    showErrorSnackbar(`Unable to delete '${model}' model: ${error}`);
    return null;
  } finally {
    produceAppState((draft) => {
      draft.settings.aiTranscription.localModelManagement.modelDeletes[model] =
        false;
    });
  }
};
