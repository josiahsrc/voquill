import { invokeHandler } from "@repo/functions";
import { Tone } from "@repo/types";
import { invoke } from "@tauri-apps/api/core";
import { invokeEnterprise } from "../utils/enterprise.utils";
import { getDefaultSystemTones } from "../utils/tone.utils";
import { BaseRepo } from "./base.repo";

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
  protected abstract listTonesInternal(): Promise<Tone[]>;
  protected abstract getToneInternal(id: string): Promise<Tone | null>;
  protected abstract upsertToneInternal(tone: Tone): Promise<Tone>;
  protected abstract deleteToneInternal(id: string): Promise<void>;

  async listTones(): Promise<Tone[]> {
    const userTones = await this.listTonesInternal();
    return mergeSystemTones(userTones);
  }

  async getTone(id: string): Promise<Tone | null> {
    const systemTone = getSystemToneById(id);
    if (systemTone) {
      return systemTone;
    }
    return this.getToneInternal(id);
  }

  async upsertTone(tone: Tone): Promise<Tone> {
    if (tone.isSystem) {
      throw new Error("System tones cannot be modified.");
    }
    return this.upsertToneInternal(tone);
  }

  async deleteTone(id: string): Promise<void> {
    if (getSystemToneById(id)) {
      throw new Error("System tones cannot be deleted.");
    }
    return this.deleteToneInternal(id);
  }
}

export class LocalToneRepo extends BaseToneRepo {
  protected async listTonesInternal(): Promise<Tone[]> {
    const tones = await invoke<LocalTone[]>("tone_list");
    return tones.map(fromLocalTone);
  }

  protected async getToneInternal(id: string): Promise<Tone | null> {
    const tone = await invoke<LocalTone | null>("tone_get", { id });
    return tone ? fromLocalTone(tone) : null;
  }

  protected async upsertToneInternal(tone: Tone): Promise<Tone> {
    const upserted = await invoke<LocalTone>("tone_upsert", {
      tone: toLocalTone(tone),
    });
    return fromLocalTone(upserted);
  }

  protected async deleteToneInternal(id: string): Promise<void> {
    await invoke("tone_delete", { id });
  }
}

export class CloudToneRepo extends BaseToneRepo {
  protected async listTonesInternal(): Promise<Tone[]> {
    const res = await invokeHandler("tone/listMyTones", {});
    return res.tones;
  }

  protected async getToneInternal(id: string): Promise<Tone | null> {
    const res = await invokeHandler("tone/listMyTones", {});
    return res.tones.find((t) => t.id === id) ?? null;
  }

  protected async upsertToneInternal(tone: Tone): Promise<Tone> {
    await invokeHandler("tone/upsertMyTone", { tone });
    return tone;
  }

  protected async deleteToneInternal(id: string): Promise<void> {
    await invokeHandler("tone/deleteMyTone", { toneId: id });
  }
}

export class EnterpriseToneRepo extends BaseToneRepo {
  protected async listTonesInternal(): Promise<Tone[]> {
    const res = await invokeEnterprise("tone/listMyTones", {});
    return res.tones;
  }

  protected async getToneInternal(id: string): Promise<Tone | null> {
    const res = await invokeEnterprise("tone/listMyTones", {});
    return res.tones.find((t) => t.id === id) ?? null;
  }

  protected async upsertToneInternal(tone: Tone): Promise<Tone> {
    await invokeEnterprise("tone/upsertMyTone", { tone });
    return tone;
  }

  protected async deleteToneInternal(id: string): Promise<void> {
    await invokeEnterprise("tone/deleteMyTone", { toneId: id });
  }
}
