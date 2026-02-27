import { firemix } from "@firemix/mixed";
import { mixpath } from "@repo/firemix";
import { invokeHandler } from "@repo/functions";
import type { FlaggedAudio } from "@repo/types";
import {
	deleteObject,
	getBytes,
	getStorage,
	ref,
	uploadBytes,
} from "firebase/storage";
import {
	createUserCreds,
	markUserAsSubscribed,
	signInWithCreds,
	signOutUser,
} from "../helpers/firebase";
import { setUp, tearDown } from "../helpers/setup";

beforeAll(setUp);
afterAll(tearDown);

const buildFlaggedAudio = (overrides?: Partial<FlaggedAudio>): FlaggedAudio => ({
	id: "flagged-1",
	filePath: "users/uid/flaggedAudio/test.wav",
	feedback: "transcription was wrong",
	transcriptionPrompt: "some context",
	postProcessingPrompt: "rewrite formally",
	rawTranscription: "hello wrold",
	postProcessedTranscription: "hello world",
	transcriptionProvider: "groq",
	postProcessingProvider: "cloud",
	sampleRate: 16000,
	...overrides,
});

const buildAudioBytes = (sizeInBytes: number): Uint8Array => {
	return new Uint8Array(sizeInBytes);
};

const SMALL_AUDIO = buildAudioBytes(1024);

describe("flaggedAudio/upsert", () => {
	it("creates a flagged audio document", async () => {
		const creds = await createUserCreds();
		await signInWithCreds(creds);
		await markUserAsSubscribed();

		const flaggedAudio = buildFlaggedAudio({ id: "create-test" });

		await invokeHandler("flaggedAudio/upsert", { flaggedAudio });

		const doc = await firemix().get(mixpath.flaggedAudio("create-test"));
		expect(doc).toBeDefined();
		expect(doc?.data.filePath).toBe(flaggedAudio.filePath);
		expect(doc?.data.feedback).toBe(flaggedAudio.feedback);
		expect(doc?.data.transcriptionPrompt).toBe(flaggedAudio.transcriptionPrompt);
		expect(doc?.data.postProcessingPrompt).toBe(flaggedAudio.postProcessingPrompt);
		expect(doc?.data.rawTranscription).toBe(flaggedAudio.rawTranscription);
		expect(doc?.data.postProcessedTranscription).toBe(
			flaggedAudio.postProcessedTranscription,
		);
		expect(doc?.data.transcriptionProvider).toBe(
			flaggedAudio.transcriptionProvider,
		);
		expect(doc?.data.postProcessingProvider).toBe(
			flaggedAudio.postProcessingProvider,
		);
	});

	it("stores null for optional fields", async () => {
		const creds = await createUserCreds();
		await signInWithCreds(creds);
		await markUserAsSubscribed();

		const flaggedAudio = buildFlaggedAudio({
			id: "null-fields-test",
			transcriptionPrompt: null,
			postProcessingPrompt: null,
			postProcessedTranscription: null,
			postProcessingProvider: null,
		});

		await invokeHandler("flaggedAudio/upsert", { flaggedAudio });

		const doc = await firemix().get(mixpath.flaggedAudio("null-fields-test"));
		expect(doc).toBeDefined();
		expect(doc?.data.transcriptionPrompt).toBeNull();
		expect(doc?.data.postProcessingPrompt).toBeNull();
		expect(doc?.data.postProcessedTranscription).toBeNull();
		expect(doc?.data.postProcessingProvider).toBeNull();
	});

	it("rejects unauthenticated requests", async () => {
		await createUserCreds();
		await signOutUser();

		await expect(
			invokeHandler("flaggedAudio/upsert", {
				flaggedAudio: buildFlaggedAudio(),
			}),
		).rejects.toThrow();
	});

	it("rejects invalid input", async () => {
		const creds = await createUserCreds();
		await signInWithCreds(creds);
		await markUserAsSubscribed();

		await expect(
			invokeHandler("flaggedAudio/upsert", {
				flaggedAudio: { id: "" },
			} as any),
		).rejects.toThrow();
	});
});

describe("storage rules", () => {
	it("allows an authenticated user to upload audio to their own path", async () => {
		const creds = await createUserCreds();
		await signInWithCreds(creds);

		const storage = getStorage();
		const fileRef = ref(storage, `users/${creds.id}/flaggedAudio/test.wav`);

		await expect(
			uploadBytes(fileRef, SMALL_AUDIO, { contentType: "audio/wav" }),
		).resolves.toBeDefined();
	});

	it("blocks reading even your own flagged audio", async () => {
		const creds = await createUserCreds();
		await signInWithCreds(creds);

		const storage = getStorage();
		const fileRef = ref(
			storage,
			`users/${creds.id}/flaggedAudio/read-test.wav`,
		);
		await uploadBytes(fileRef, SMALL_AUDIO, { contentType: "audio/wav" });

		await expect(getBytes(fileRef)).rejects.toThrow();
	});

	it("blocks writing to another user's path", async () => {
		const owner = await createUserCreds();
		const other = await createUserCreds();
		await signInWithCreds(other);

		const storage = getStorage();
		const fileRef = ref(storage, `users/${owner.id}/flaggedAudio/hijack.wav`);

		await expect(
			uploadBytes(fileRef, SMALL_AUDIO, { contentType: "audio/wav" }),
		).rejects.toThrow();
	});

	it("blocks unauthenticated uploads", async () => {
		const creds = await createUserCreds();
		await signOutUser();

		const storage = getStorage();
		const fileRef = ref(storage, `users/${creds.id}/flaggedAudio/unauth.wav`);

		await expect(
			uploadBytes(fileRef, SMALL_AUDIO, { contentType: "audio/wav" }),
		).rejects.toThrow();
	});

	it("blocks non-audio content types", async () => {
		const creds = await createUserCreds();
		await signInWithCreds(creds);

		const storage = getStorage();
		const fileRef = ref(
			storage,
			`users/${creds.id}/flaggedAudio/malicious.exe`,
		);

		await expect(
			uploadBytes(fileRef, SMALL_AUDIO, {
				contentType: "application/octet-stream",
			}),
		).rejects.toThrow();
	});

	it("blocks uploads exceeding 50MB", async () => {
		const creds = await createUserCreds();
		await signInWithCreds(creds);

		const storage = getStorage();
		const fileRef = ref(storage, `users/${creds.id}/flaggedAudio/huge.wav`);
		const oversized = buildAudioBytes(50 * 1024 * 1024 + 1);

		await expect(
			uploadBytes(fileRef, oversized, { contentType: "audio/wav" }),
		).rejects.toThrow();
	});

	it("blocks deleting a file", async () => {
		const creds = await createUserCreds();
		await signInWithCreds(creds);

		const storage = getStorage();
		const fileRef = ref(storage, `users/${creds.id}/flaggedAudio/keep.wav`);
		await uploadBytes(fileRef, SMALL_AUDIO, { contentType: "audio/wav" });

		await expect(deleteObject(fileRef)).rejects.toThrow();
	});

	it("blocks uploads outside the users audio path", async () => {
		const creds = await createUserCreds();
		await signInWithCreds(creds);

		const storage = getStorage();
		const fileRef = ref(storage, `other-path/${creds.id}/test.wav`);

		await expect(
			uploadBytes(fileRef, SMALL_AUDIO, { contentType: "audio/wav" }),
		).rejects.toThrow();
	});
});
