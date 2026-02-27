import { deleteObject, getStorage, ref, uploadBytes } from "firebase/storage";
import {
	createUserCreds,
	signInWithCreds,
	signOutUser,
} from "../helpers/firebase";
import { setUp, tearDown } from "../helpers/setup";

beforeAll(setUp);
afterAll(tearDown);

const buildAudioBytes = (sizeInBytes: number): Uint8Array => {
	return new Uint8Array(sizeInBytes);
};

const SMALL_AUDIO = buildAudioBytes(1024);

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

		const { getBytes } = await import("firebase/storage");
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
