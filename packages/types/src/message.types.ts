import type { Nullable, ResponseGenerationMode } from "./common.types";
import type { PartialConfig } from "./config.types";
import type { Member } from "./member.types";
import type { User } from "./user.types";

export type AppRecordingState = "idle" | "recording" | "processing";

export type LoggedOutState = {
	state: "loggedOut";
	user: null;
	member: null;
	config: null;
	error: null;
};

export type LoggedInState = {
	state: "loggedIn";
	user: User;
	member: Member;
	config?: Nullable<PartialConfig>;
	error: null;
};

export type ErrorState = {
	state: "error";
	user: null;
	member: null;
	config: null;
	error: string;
};

export type DataState = LoggedOutState | LoggedInState | ErrorState;

export type ResponseShape<T = unknown> = {
	ok: boolean;
	id?: string;
	data?: Nullable<T>;
};

type BaseMessage<T extends string> = {
	type: `voquill_${T}`;
	id?: string;
};

export type VoquillMessage = DomMessage | WorkerMessage;

////////////////
/// DOM
////////////////

type BaseDomMessage<T extends string> = BaseMessage<`dom_${T}`>;

export type DomDispatchStopRecordingMessage =
	BaseDomMessage<"dispatch_stop_recording">;

export type DomRecordingStateChangeMessage =
	BaseDomMessage<"recording_state_change"> & {
		state: AppRecordingState;
	};

export type DomRecordingAudioChangeMessage =
	BaseDomMessage<"recording_audio_change"> & {
		rms: number;
		time: number;
	};

export type DomInjectTextMessage = BaseDomMessage<"inject_text"> & {
	text: string;
	replace: boolean;
};

export type DomProxyToWorkerMessage = BaseDomMessage<"proxy_to_worker"> & {
	workerMessage: WorkerMessage;
};

export type DomBeginRecordingMessage = BaseDomMessage<"begin_recording">;

export type DomEndRecordingMessage = BaseDomMessage<"end_recording">;
export type DomEndRecordingMessageResponse = ResponseShape<{
	base64: string;
	mimeType: string;
}>;

export type DomDataStateChangeMessage = BaseDomMessage<"data_state_change"> & {
	data: DataState;
};

export type DomExtensionInstallCheckRequestMessage =
	BaseDomMessage<"extension_install_check_request">;

export type DomExtensionInstallCheckResponseMessage =
	BaseDomMessage<"extension_install_check_response">;

export type DomMessage =
	| DomDispatchStopRecordingMessage
	| DomRecordingStateChangeMessage
	| DomRecordingAudioChangeMessage
	| DomInjectTextMessage
	| DomProxyToWorkerMessage
	| DomBeginRecordingMessage
	| DomEndRecordingMessage
	| DomDataStateChangeMessage
	| DomExtensionInstallCheckRequestMessage
	| DomExtensionInstallCheckResponseMessage;

////////////////
/// WORKER
////////////////

type BaseWorkerMessage<T extends string> = BaseMessage<`worker_${T}`>;

export type WorkerSetAuthMessage = BaseWorkerMessage<"set_auth"> & {
	token: string;
};

export type WorkerStartRecordingMessage =
	BaseWorkerMessage<"start_recording"> & {
		mode: ResponseGenerationMode;
	};

export type WorkerStopRecordingMessage = BaseWorkerMessage<"stop_recording"> & {
	pageContext: string;
	inputContext: string;
	inputCurrent: string;
	inputSelection: string;
};

export type WorkerEmitDataStateMessage = BaseWorkerMessage<"emit_data_state">;

export type WorkerTryLoginMessage = BaseWorkerMessage<"try_login">;

export type WorkerDispatchMixpanelEventMessage =
	BaseWorkerMessage<"dispatch_mixpanel_event"> & {
		event: string;
		props?: Record<string, unknown>;
	};

export type WorkerMessage =
	| WorkerSetAuthMessage
	| WorkerStartRecordingMessage
	| WorkerStopRecordingMessage
	| WorkerEmitDataStateMessage
	| WorkerTryLoginMessage
	| WorkerDispatchMixpanelEventMessage;
