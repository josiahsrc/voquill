export type Tone = {
  id: string;
  name: string;
  promptTemplate: string;
  isSystem: boolean;
  createdAt: number;
  sortOrder: number;
};

export type ToneCreateRequest = {
  id: string;
  name: string;
  promptTemplate: string;
  sortOrder?: number;
};
