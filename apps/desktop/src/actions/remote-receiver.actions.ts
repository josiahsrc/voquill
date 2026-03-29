import type { Nullable, RemoteReceiverStatus } from "@voquill/types";
import { getRemoteReceiverRepo } from "../repos";
import { produceAppState } from "../store";

const setRemoteReceiverStatus = (
  status: Nullable<RemoteReceiverStatus>,
): void => {
  produceAppState((draft) => {
    draft.remoteReceiverStatus = status;
  });
};

export const refreshRemoteReceiverStatus =
  async (): Promise<RemoteReceiverStatus> => {
    const status = await getRemoteReceiverRepo().getRemoteReceiverStatus();
    setRemoteReceiverStatus(status);
    return status;
  };

export const startRemoteReceiver = async (
  port?: number | null,
): Promise<RemoteReceiverStatus> => {
  const status = await getRemoteReceiverRepo().startRemoteReceiver(port);
  setRemoteReceiverStatus(status);
  return status;
};

export const stopRemoteReceiver = async (): Promise<RemoteReceiverStatus> => {
  const status = await getRemoteReceiverRepo().stopRemoteReceiver();
  setRemoteReceiverStatus(status);
  return status;
};
