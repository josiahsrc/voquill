import { Tone } from "@repo/types";
import { invoke } from "@tauri-apps/api/core";
import { BaseRepo } from "./base.repo";

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

export abstract class BaseToneRepo extends BaseRepo {
  abstract listTones(): Promise<Tone[]>;
  abstract getTone(id: string): Promise<Tone | null>;
  abstract upsertTone(tone: Tone): Promise<Tone>;
  abstract deleteTone(id: string): Promise<void>;
}

export class LocalToneRepo extends BaseToneRepo {
  async listTones(): Promise<Tone[]> {
    const tones = await invoke<LocalTone[]>("tone_list");
    return tones.map(fromLocalTone);
  }

  async getTone(id: string): Promise<Tone | null> {
    const tone = await invoke<LocalTone | null>("tone_get", { id });
    return tone ? fromLocalTone(tone) : null;
  }

  async upsertTone(tone: Tone): Promise<Tone> {
    const upserted = await invoke<LocalTone>("tone_upsert", { tone });
    return fromLocalTone(upserted);
  }

  async deleteTone(id: string): Promise<void> {
    await invoke("tone_delete", { id });
  }
}
