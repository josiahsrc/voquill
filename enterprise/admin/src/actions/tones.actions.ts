import type { Tone } from "@repo/types";
import { invoke } from "../utils/api.utils";
import { produceAppState } from "../store";
import { registerTones } from "../utils/app.utils";

export async function loadGlobalTones() {
  try {
    const data = await invoke("tone/listGlobalTones", {});
    produceAppState((draft) => {
      registerTones(draft, data.tones);
      draft.tones.toneIds = data.tones.map((t) => t.id);
      draft.tones.status = "success";
    });
  } catch {
    produceAppState((draft) => {
      draft.tones.status = "error";
    });
  }
}

export async function upsertGlobalTone(tone: Tone) {
  await invoke("tone/upsertGlobalTone", { tone });
  produceAppState((draft) => {
    registerTones(draft, [tone]);
    if (!draft.tones.toneIds.includes(tone.id)) {
      draft.tones.toneIds.unshift(tone.id);
    }
  });
}

export async function deleteGlobalTone(toneId: string) {
  await invoke("tone/deleteGlobalTone", { toneId });
  produceAppState((draft) => {
    draft.tones.toneIds = draft.tones.toneIds.filter((id) => id !== toneId);
    delete draft.toneById[toneId];
  });
}
