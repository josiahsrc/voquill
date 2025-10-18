import { Hotkey } from "@repo/types";
import { invoke } from "@tauri-apps/api/core";
import { BaseRepo } from "./base.repo";

export abstract class BaseHotkeyRepo extends BaseRepo {
  abstract listHotkeys(): Promise<Hotkey[]>;
  abstract saveHotkey(hotkey: Hotkey): Promise<Hotkey>;
}

export class LocalHotkeyRepo extends BaseHotkeyRepo {
  async listHotkeys(): Promise<Hotkey[]> {
    return invoke<Hotkey[]>("hotkey_list");
  }

  async saveHotkey(hotkey: Hotkey): Promise<Hotkey> {
    return invoke<Hotkey>("hotkey_save", { hotkey });
  }
}
