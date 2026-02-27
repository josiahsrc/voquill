import { firemix } from "@firemix/mixed";
import { mixpath } from "@repo/firemix";
import { invokeHandler } from "@repo/functions";
import { signInWithCustomToken, getAuth } from "firebase/auth";
import { buildSilenceWavBase64 } from "../helpers/audio";
import { getFirebaseFunctionsEndpoint } from "../helpers/env";
import {
	createUserCreds,
	markUserAsSubscribed,
	signInWithCreds,
	signOutUser,
} from "../helpers/firebase";
import { setUp, tearDown } from "../helpers/setup";

beforeAll(setUp);
afterAll(tearDown);

async function callHandlerRaw(
	handlerName: string,
	args: unknown,
	idToken?: string,
): Promise<unknown> {
	const url = `${getFirebaseFunctionsEndpoint()}/handler`;
	const headers: Record<string, string> = {
		"Content-Type": "application/json",
	};
	if (idToken) {
		headers["Authorization"] = `Bearer ${idToken}`;
	}
	const res = await fetch(url, {
		method: "POST",
		headers,
		body: JSON.stringify({ data: { name: handlerName, args } }),
	});
	const json = (await res.json()) as { result?: unknown; error?: unknown };
	if (json.error) {
		throw new Error(JSON.stringify(json.error));
	}
	return json.result;
}

describe("auth/createApiToken", () => {
	it("returns both tokens when authenticated", async () => {
		const creds = await createUserCreds();
		await signInWithCreds(creds);
		await markUserAsSubscribed();

		const res = await invokeHandler("auth/createApiToken", {});
		expect(res.apiToken).toBeDefined();
		expect(typeof res.apiToken).toBe("string");
		expect(res.apiRefreshToken).toBeDefined();
		expect(res.apiRefreshToken.length).toBe(64);
	});

	it("fails when unauthenticated", async () => {
		await signOutUser();
		await expect(invokeHandler("auth/createApiToken", {})).rejects.toThrow();
	});
});

describe("auth/refreshApiToken", () => {
	it("returns a valid custom token given a valid refresh token", async () => {
		const creds = await createUserCreds();
		await signInWithCreds(creds);
		await markUserAsSubscribed();

		const createRes = await invokeHandler("auth/createApiToken", {});

		await signOutUser();
		const refreshRes = await invokeHandler("auth/refreshApiToken", {
			apiRefreshToken: createRes.apiRefreshToken,
		});
		expect(refreshRes.apiToken).toBeDefined();
		expect(typeof refreshRes.apiToken).toBe("string");
	});

	it("fails with an invalid refresh token", async () => {
		await signOutUser();
		await expect(
			invokeHandler("auth/refreshApiToken", {
				apiRefreshToken: "0".repeat(64),
			}),
		).rejects.toThrow();
	});
});

describe("round-trip", () => {
	it("create -> refresh -> signInWithCustomToken", async () => {
		const creds = await createUserCreds();
		await signInWithCreds(creds);
		await markUserAsSubscribed();

		const createRes = await invokeHandler("auth/createApiToken", {});

		await signOutUser();
		const refreshRes = await invokeHandler("auth/refreshApiToken", {
			apiRefreshToken: createRes.apiRefreshToken,
		});

		const auth = getAuth();
		const userCred = await signInWithCustomToken(auth, refreshRes.apiToken);
		expect(userCred.user.uid).toBe(creds.id);
	});
});

describe("keyboard extension flow", () => {
	it("calls ai/transcribeAudio via raw HTTP using API token auth", async () => {
		const creds = await createUserCreds();
		await signInWithCreds(creds);
		await markUserAsSubscribed();
		await invokeHandler("member/tryInitialize", {});
		await firemix().update(mixpath.members(creds.id), { plan: "pro" });

		const createRes = await invokeHandler("auth/createApiToken", {});
		await signOutUser();

		const refreshRes = (await callHandlerRaw("auth/refreshApiToken", {
			apiRefreshToken: createRes.apiRefreshToken,
		})) as { apiToken: string };

		const auth = getAuth();
		const userCred = await signInWithCustomToken(auth, refreshRes.apiToken);
		const idToken = await userCred.user.getIdToken();
		await signOutUser();

		const transcribeRes = (await callHandlerRaw(
			"ai/transcribeAudio",
			{
				audioBase64: buildSilenceWavBase64(1),
				audioMimeType: "audio/wav",
				simulate: true,
				language: "en",
			},
			idToken,
		)) as { text: string };

		expect(transcribeRes.text).toBe("Simulated response");
	});

	it("calls ai/generateText via raw HTTP using API token auth", async () => {
		const creds = await createUserCreds();
		await signInWithCreds(creds);
		await markUserAsSubscribed();
		await invokeHandler("member/tryInitialize", {});
		await firemix().update(mixpath.members(creds.id), { plan: "pro" });

		const createRes = await invokeHandler("auth/createApiToken", {});
		await signOutUser();

		const refreshRes = (await callHandlerRaw("auth/refreshApiToken", {
			apiRefreshToken: createRes.apiRefreshToken,
		})) as { apiToken: string };

		const auth = getAuth();
		const userCred = await signInWithCustomToken(auth, refreshRes.apiToken);
		const idToken = await userCred.user.getIdToken();
		await signOutUser();

		const generateRes = (await callHandlerRaw(
			"ai/generateText",
			{
				prompt: "Hello world",
				simulate: true,
			},
			idToken,
		)) as { text: string };

		expect(generateRes.text).toBe("Simulated generated text.");
	});
});
