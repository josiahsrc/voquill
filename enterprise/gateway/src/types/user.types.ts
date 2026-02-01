import type { Nullable } from "@repo/types";

export type UserRow = {
  id: string;
  created_at: Date;
  updated_at: Date;
  name: string;
  bio: Nullable<string>;
  company: Nullable<string>;
  title: Nullable<string>;
  onboarded: boolean;
  onboarded_at: Nullable<Date>;
  timezone: Nullable<string>;
  preferred_language: Nullable<string>;
  preferred_microphone: Nullable<string>;
  play_interaction_chime: boolean;
  has_finished_tutorial: boolean;
  words_this_month: number;
  words_this_month_month: Nullable<string>;
  words_total: number;
  has_migrated_preferred_microphone: boolean;
  cohort: Nullable<string>;
  should_show_upgrade_dialog: boolean;
  styling_mode: string | null;
};
