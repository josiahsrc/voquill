import { useEffect } from "react";
import { useIntl } from "react-intl";
import { produceAppState, useAppStore } from "../../store";
import { getMyMember } from "../../utils/member.utils";
import {
  sendPillFireworks,
  sendPillFlashMessage,
} from "../../utils/overlay.utils";
import { hoursToMilliseconds } from "../../utils/time.utils";
import {
  getIsDictationUnlocked,
  getUsingCloudPrefs,
} from "../../utils/user.utils";

const REMINDER_CHECK_INTERVAL_MS = hoursToMilliseconds(1);
const REMINDER_COOLDOWN_MS = hoursToMilliseconds(8);
const INACTIVITY_THRESHOLD_MS = hoursToMilliseconds(16);

export const AffordancesSideEffects = () => {
  const intl = useIntl();
  const dictationUnlocked = useAppStore(getIsDictationUnlocked);
  const isCloudDictation = useAppStore(getUsingCloudPrefs);

  const isActiveSession = useAppStore(
    (state) => state.activeRecordingMode !== null,
  );

  const lastReminderShownAt = useAppStore(
    (state) => state.local.lastDictationReminderShownAt,
  );

  const isOnOriginalTrial = useAppStore((state) => {
    const member = getMyMember(state);
    if (!member?.isOnTrial || !member.originalTrialEndsAt) return false;
    return new Date(member.originalTrialEndsAt).getTime() > Date.now();
  });

  const wordsNeeded = useAppStore((state) => {
    const member = getMyMember(state);
    const config = state.config;
    if (!member || !config) return 0;
    return Math.max(0, config.wordsNeededForTrialExtension - member.wordsToday);
  });

  const lastDictatedAt = useAppStore((state) => state.local.lastDictatedAt);

  useEffect(() => {
    if (!isCloudDictation) return;
    if (!dictationUnlocked) return;
    if (!isOnOriginalTrial) return;
    if (isActiveSession) return;

    const check = () => {
      if (isActiveSession) {
        return;
      }

      const now = Date.now();
      if (
        lastReminderShownAt &&
        now - lastReminderShownAt < REMINDER_COOLDOWN_MS
      ) {
        return;
      }

      if (lastDictatedAt && now - lastDictatedAt < INACTIVITY_THRESHOLD_MS) {
        return;
      }

      if (wordsNeeded > 0) {
        sendPillFlashMessage(
          intl.formatMessage(
            {
              defaultMessage: "Dictate {words} more words today for a free day",
            },
            { words: wordsNeeded },
          ),
        );
        produceAppState((draft) => {
          draft.local.lastDictationReminderShownAt = now;
        });
      }
    };

    check();
    const interval = setInterval(check, REMINDER_CHECK_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [
    isCloudDictation,
    dictationUnlocked,
    isOnOriginalTrial,
    isActiveSession,
    lastReminderShownAt,
    lastDictatedAt,
    wordsNeeded,
    intl,
  ]);

  const trialExtensionLastClaimedAt = useAppStore((state) => {
    const member = getMyMember(state);
    return member?.trialExtensionLastClaimedAt ?? null;
  });

  const lastSeenTrialExtension = useAppStore(
    (state) => state.local.lastSeenTrialExtensionClaimedAt,
  );

  useEffect(() => {
    if (!isCloudDictation) return;
    if (!dictationUnlocked) return;
    if (!trialExtensionLastClaimedAt) return;
    if (trialExtensionLastClaimedAt === lastSeenTrialExtension) return;

    produceAppState((draft) => {
      draft.local.lastSeenTrialExtensionClaimedAt = trialExtensionLastClaimedAt;
    });

    if (lastSeenTrialExtension) {
      sendPillFireworks(
        intl.formatMessage({
          defaultMessage: "You just earned a free day!",
        }),
      );
    }
  }, [
    isCloudDictation,
    dictationUnlocked,
    trialExtensionLastClaimedAt,
    lastSeenTrialExtension,
    intl,
  ]);

  return null;
};
