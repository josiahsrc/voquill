import {
  getDatabase,
  onDisconnect,
  onValue,
  ref,
  remove,
  set,
  update,
  type DatabaseReference,
  type Unsubscribe,
} from "firebase/database";
import { useRef } from "react";
import { showSnackbar } from "../../actions/app.actions";
import { refreshRemoteReceiverStatus } from "../../actions/remote-receiver.actions";
import { handleRemoteFinalTextReceived } from "../../actions/remote-transcript.actions";
import { useAsyncEffect } from "../../hooks/async.hooks";
import { useIntervalAsync } from "../../hooks/helper.hooks";
import { getAppState, useAppStore } from "../../store";
import { getLogger } from "../../utils/log.utils";

// 10 minutes
const SESSION_HEARTBEAT_INTERVAL_MS = 1000 * 60 * 10;

type SessionHandle = {
  sessionRef: DatabaseReference;
  listenerUnsubscribe: Unsubscribe | null;
  lastConsumedTimestamp: number;
};

export const SessionSideEffects = () => {
  const userId = useAppStore((state) => state.auth?.uid ?? "");
  const initialized = useAppStore((state) => state.initialized);
  const sessionHandleRef = useRef<SessionHandle | null>(null);

  useAsyncEffect(async () => {
    if (!initialized || !userId) return;

    await refreshRemoteReceiverStatus();
    const status = getAppState().remoteReceiverStatus;
    const sessionId = status?.deviceId;
    const sessionName = status?.deviceName ?? "Voquill Desktop";
    if (!sessionId) return;

    const db = getDatabase();
    const sessionRef = ref(db, `session/${userId}/${sessionId}`);

    await set(sessionRef, {
      name: sessionName,
      lastActive: Date.now(),
    });
    await onDisconnect(sessionRef).remove();

    const handle: SessionHandle = {
      sessionRef,
      listenerUnsubscribe: null,
      lastConsumedTimestamp: Date.now(),
    };

    handle.listenerUnsubscribe = onValue(sessionRef, async (snapshot) => {
      const data = snapshot.val();
      if (!data?.pasteText || !data?.pasteTimestamp) return;
      if (data.pasteTimestamp <= handle.lastConsumedTimestamp) return;

      handle.lastConsumedTimestamp = data.pasteTimestamp;
      const text = data.pasteText;

      getLogger().info(`Session received paste text (${text.length} chars)`);

      await update(sessionRef, { pasteText: null, pasteTimestamp: null });
      handleRemoteFinalTextReceived({
        senderDeviceId: sessionId,
        eventId: `session-${Date.now()}`,
        text,
        mode: "text",
        createdAt: new Date().toISOString(),
      });
      showSnackbar("Remote text inserted.", { mode: "success" });
    });

    sessionHandleRef.current = handle;
    getLogger().info(`Session published: ${sessionId}`);

    return () => {
      sessionHandleRef.current = null;
      handle.listenerUnsubscribe?.();
      void remove(sessionRef).catch((error) => {
        getLogger().warning(`Failed to remove session: ${error}`);
      });
    };
  }, [initialized, userId]);

  useIntervalAsync(SESSION_HEARTBEAT_INTERVAL_MS, async () => {
    const handle = sessionHandleRef.current;
    if (!handle) return;
    await update(handle.sessionRef, { lastActive: Date.now() });
  }, [initialized, userId]);

  return null;
};
