export type TermRow = {
  id: string;
  user_id: string;
  created_at: Date;
  source_value: string;
  destination_value: string;
  is_replacement: boolean;
  is_global: boolean;
};
