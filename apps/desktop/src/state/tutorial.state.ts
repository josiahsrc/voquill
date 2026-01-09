export type TutorialState = {
  pageIndex: number;
  dictationValue: string;
  agentDictationValue: string;
};

export const INITIAL_TUTORIAL_STATE: TutorialState = {
  pageIndex: 0,
  dictationValue: "",
  agentDictationValue: "",
};
