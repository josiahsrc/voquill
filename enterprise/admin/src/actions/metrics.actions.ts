import type { MetricsRange } from "@repo/types";
import { produceAppState } from "../store";
import { invoke } from "../utils/api.utils";
import { showErrorSnackbar } from "./app.actions";

export async function loadMetrics(range?: MetricsRange) {
  const effectiveRange = range ?? "7d";
  try {
    produceAppState((draft) => {
      draft.metrics.status = "loading";
      if (range) {
        draft.metrics.range = range;
      }
    });

    const data = await invoke("metrics/getSummary", { range: effectiveRange });

    produceAppState((draft) => {
      draft.metrics.summary = data.summary;
      draft.metrics.daily = data.daily;
      draft.metrics.perUser = data.perUser;
      draft.metrics.status = "success";
    });
  } catch (err) {
    showErrorSnackbar(err);
    produceAppState((draft) => {
      draft.metrics.status = "error";
    });
  }
}
