export type ToneRow = {
  id: string;
  user_id: string;
  created_at: Date;
  name: string;
  prompt_template: string;
  is_system: boolean;
  sort_order: number;
  is_global: boolean;
};
