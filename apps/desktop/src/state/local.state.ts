export type LocalState = {
  assistantModeEnabled: boolean;
  powerModeEnabled: boolean;
  lastDictationReminderShownAt: number | null;
  lastDictatedAt: number | null;
  lastSeenTrialExtensionClaimedAt: string | null;
  featureSeenAt: string | null;
};

export const INITIAL_LOCAL_STATE: LocalState = {
  assistantModeEnabled: false,
  powerModeEnabled: false,
  lastDictationReminderShownAt: null,
  lastDictatedAt: null,
  lastSeenTrialExtensionClaimedAt: null,
  featureSeenAt: null,
};
