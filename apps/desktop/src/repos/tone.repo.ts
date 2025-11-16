import { Tone, ToneCreateRequest } from "@repo/types";
import { invoke } from "@tauri-apps/api/core";
import { BaseRepo } from "./base.repo";
import { getLocalizedHardcodedTones } from "../utils/tone.utils";

type LocalTone = {
  id: string;
  name: string;
  promptTemplate: string;
  isSystem: boolean;
  createdAt: number;
  sortOrder: number;
};

const fromLocalTone = (tone: LocalTone): Tone => ({
  id: tone.id,
  name: tone.name,
  promptTemplate: tone.promptTemplate,
  isSystem: tone.isSystem,
  createdAt: tone.createdAt,
  sortOrder: tone.sortOrder,
});

const toLocalTone = (tone: Tone): LocalTone => ({
  id: tone.id,
  name: tone.name,
  promptTemplate: tone.promptTemplate,
  isSystem: tone.isSystem,
  createdAt: tone.createdAt,
  sortOrder: tone.sortOrder,
});

export abstract class BaseToneRepo extends BaseRepo {
  abstract listTones(): Promise<Tone[]>;
  abstract getTone(id: string): Promise<Tone | null>;
  abstract createTone(request: ToneCreateRequest): Promise<Tone>;
  abstract updateTone(tone: Tone): Promise<Tone>;
  abstract deleteTone(id: string): Promise<void>;
}

export class LocalToneRepo extends BaseToneRepo {
  async listTones(): Promise<Tone[]> {
    const hardcoded = getLocalizedHardcodedTones();
    const tones = await invoke<LocalTone[]>("tone_list");
    return [...hardcoded, ...tones.map(fromLocalTone)];
  }

  async getTone(id: string): Promise<Tone | null> {
    const tone = await invoke<LocalTone | null>("tone_get", { id });
    return tone ? fromLocalTone(tone) : null;
  }

  async createTone(request: ToneCreateRequest): Promise<Tone> {
    const created = await invoke<LocalTone>("tone_create", { tone: request });
    return fromLocalTone(created);
  }

  async updateTone(tone: Tone): Promise<Tone> {
    const updated = await invoke<LocalTone>("tone_update", {
      tone: toLocalTone(tone),
    });
    return fromLocalTone(updated);
  }

  async deleteTone(id: string): Promise<void> {
    await invoke("tone_delete", { id });
  }

}
