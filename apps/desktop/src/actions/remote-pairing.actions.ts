import type {
  PairedRemoteDevice,
  RemoteDevicePlatform,
  RemoteReceiverStatus,
} from "@repo/types";
import { invoke } from "@tauri-apps/api/core";
import { getAppState, produceAppState } from "../store";
import { registerPairedRemoteDevices } from "../utils/app.utils";
import { getPlatform } from "../utils/platform.utils";
import {
  setRemoteOutputEnabled,
  setRemoteTargetDeviceId,
} from "./user.actions";

const INVITE_PREFIX = "voquill-pair:";

type RemotePairingInvite = {
  version: 1;
  receiverDeviceId: string;
  receiverDeviceName: string;
  receiverPlatform: RemoteDevicePlatform;
  receiverAddress: string;
  pairingCode: string;
};

const encodeBase64Url = (value: string): string => {
  const bytes = new TextEncoder().encode(value);
  let binary = "";
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
};

const decodeBase64Url = (value: string): string => {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=");
  const binary = atob(padded);
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
  return new TextDecoder().decode(bytes);
};

export const buildRemotePairingInvite = (
  status: RemoteReceiverStatus,
): string | null => {
  if (!status.enabled || !status.listenAddress || !status.port) {
    return null;
  }

  const invite: RemotePairingInvite = {
    version: 1,
    receiverDeviceId: status.deviceId,
    receiverDeviceName: status.deviceName,
    receiverPlatform:
      (
        status as RemoteReceiverStatus & {
          devicePlatform?: RemoteDevicePlatform;
        }
      ).devicePlatform ?? (getPlatform() as RemoteDevicePlatform),
    receiverAddress: `${status.listenAddress}:${status.port}`,
    pairingCode: status.pairingCode,
  };

  return `${INVITE_PREFIX}${encodeBase64Url(JSON.stringify(invite))}`;
};

export const parseRemotePairingInvite = (value: string): RemotePairingInvite => {
  const trimmed = value.trim();
  if (!trimmed.startsWith(INVITE_PREFIX)) {
    throw new Error("Pair code is not a valid Voquill remote invite.");
  }

  const decoded = decodeBase64Url(trimmed.slice(INVITE_PREFIX.length));
  const invite = JSON.parse(decoded) as RemotePairingInvite;
  if (
    invite.version !== 1 ||
    !invite.receiverDeviceId ||
    !invite.receiverDeviceName ||
    !invite.receiverPlatform ||
    !invite.receiverAddress ||
    !invite.pairingCode
  ) {
    throw new Error("Pair code is missing required receiver information.");
  }

  return invite;
};

export const pairWithRemoteInvite = async (
  inviteCode: string,
): Promise<PairedRemoteDevice> => {
  const invite = parseRemotePairingInvite(inviteCode);
  const previousTargetId =
    getAppState().userPrefs?.remoteTargetDeviceId ?? null;
  const device = await invoke<PairedRemoteDevice>(
    "remote_sender_pair_with_receiver",
    {
      args: {
        receiverDeviceId: invite.receiverDeviceId,
        receiverName: invite.receiverDeviceName,
        receiverPlatform: invite.receiverPlatform,
        receiverAddress: invite.receiverAddress,
        pairingCode: invite.pairingCode,
      },
    },
  );

  produceAppState((draft) => {
    registerPairedRemoteDevices(draft, [device]);
  });
  await setRemoteTargetDeviceId(device.id);
  if (previousTargetId === invite.receiverDeviceId) {
    await setRemoteOutputEnabled(true);
  }
  return device;
};
