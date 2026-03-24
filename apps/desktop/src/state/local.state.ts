export type LocalState = {
  assistantModeEnabled: boolean;
  powerModeEnabled: boolean;
};

export const INITIAL_LOCAL_STATE: LocalState = {
  assistantModeEnabled: false,
  powerModeEnabled: false,
};
