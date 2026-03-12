import type { Nullable } from "./common.types";

export type RemoteDevicePlatform = "windows" | "macos" | "linux";

export type RemoteDeviceRole = "sender" | "receiver" | "both";

export type PairedRemoteDevice = {
  id: string;
  name: string;
  platform: RemoteDevicePlatform;
  role: RemoteDeviceRole;
  sharedSecret: string;
  pairedAt: string;
  lastSeenAt: Nullable<string>;
  lastKnownAddress: Nullable<string>;
  trusted: boolean;
};

export type RemoteOutputMode = "local" | "remote";

export type RemoteOutputPreferences = {
  remoteOutputEnabled: boolean;
  remoteTargetDeviceId: Nullable<string>;
};

export type RemoteReceiverStatus = {
  enabled: boolean;
  deviceId: string;
  deviceName: string;
  listenAddress: Nullable<string>;
  port: Nullable<number>;
  pairingCode: string;
  lastSenderDeviceId: Nullable<string>;
  lastEventId: Nullable<string>;
};

export type RouteTranscriptOutputArgs = {
  text: string;
  mode: "dictation";
  currentAppId: Nullable<string>;
};

export type RouteTranscriptOutputResult = {
  delivered: boolean;
  remote: boolean;
};

export type PairingRequest = {
  type: "pairing_request";
  requestId: string;
  senderDeviceId: string;
  senderDeviceName: string;
  pairingCode: string;
};

export type PairingAccept = {
  type: "pairing_accept";
  requestId: string;
  receiverDeviceId: string;
  receiverDeviceName: string;
  sharedSecret: string;
};

export type SessionHello = {
  type: "session_hello";
  sessionId: string;
  senderDeviceId: string;
  authToken: string;
};

export type SessionAck = {
  type: "session_ack";
  sessionId: string;
  receiverDeviceId: string;
};

export type Heartbeat = {
  type: "heartbeat";
  sessionId: string;
  sentAt: string;
};

export type FinalTextEvent = {
  type: "final_text";
  sessionId: string;
  eventId: string;
  sequence: number;
  text: string;
  mode: "dictation";
  createdAt: string;
};

export type DeliveryAck = {
  type: "delivery_ack";
  sessionId: string;
  eventId: string;
  sequence: number;
  deliveredAt: string;
};

export type DeliveryError = {
  type: "delivery_error";
  sessionId: string;
  eventId: string;
  sequence: number;
  code: string;
  message: string;
};

export type RemoteEnvelope =
  | PairingRequest
  | PairingAccept
  | SessionHello
  | SessionAck
  | Heartbeat
  | FinalTextEvent
  | DeliveryAck
  | DeliveryError;
