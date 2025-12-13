import { Tone } from "@repo/types";
import { invoke } from "@tauri-apps/api/core";
import { BaseRepo } from "./base.repo";
import { getDefaultSystemTones } from "../utils/tone.utils";

type LocalTone = {
  id: string;
  name: string;
  promptTemplate: string;
  createdAt: number;
  sortOrder: number;
};

const fromLocalTone = (tone: LocalTone): Tone => ({
  id: tone.id,
  name: tone.name,
  promptTemplate: tone.promptTemplate,
  isSystem: false,
  createdAt: tone.createdAt,
  sortOrder: tone.sortOrder,
});

const toLocalTone = (tone: Tone): LocalTone => ({
  id: tone.id,
  name: tone.name,
  promptTemplate: tone.promptTemplate,
  createdAt: tone.createdAt,
  sortOrder: tone.sortOrder,
});

const getSystemToneById = (id: string): Tone | undefined =>
  getDefaultSystemTones().find((tone) => tone.id === id);

const mergeSystemTones = (userTones: Tone[]): Tone[] => {
  const systemTones = getDefaultSystemTones();
  const combined = [...systemTones, ...userTones];
  return combined.sort((left, right) => left.sortOrder - right.sortOrder);
};

export abstract class BaseToneRepo extends BaseRepo {
  abstract listTones(): Promise<Tone[]>;
  abstract getTone(id: string): Promise<Tone | null>;
  abstract upsertTone(tone: Tone): Promise<Tone>;
  abstract deleteTone(id: string): Promise<void>;
}

export class LocalToneRepo extends BaseToneRepo {
  async listTones(): Promise<Tone[]> {
    const tones = await invoke<LocalTone[]>("tone_list");
    const userTones = tones.map(fromLocalTone);
    return mergeSystemTones(userTones);
  }

  async getTone(id: string): Promise<Tone | null> {
    const systemTone = getSystemToneById(id);
    if (systemTone) {
      return systemTone;
    }

    const tone = await invoke<LocalTone | null>("tone_get", { id });
    return tone ? fromLocalTone(tone) : null;
  }

  async upsertTone(tone: Tone): Promise<Tone> {
    if (tone.isSystem) {
      throw new Error("System tones cannot be modified.");
    }

    const upserted = await invoke<LocalTone>("tone_upsert", {
      tone: toLocalTone(tone),
    });
    return fromLocalTone(upserted);
  }

  async deleteTone(id: string): Promise<void> {
    if (getSystemToneById(id)) {
      throw new Error("System tones cannot be deleted.");
    }

    await invoke("tone_delete", { id });
  }
}
