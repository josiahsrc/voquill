import { firemix } from "@firemix/mixed";
import { mixpath } from "@voquill/firemix";
import { invokeHandler } from "@voquill/functions";
import { FULL_CONFIG, type LlmStreamEvent } from "@voquill/types";
import dayjs from "dayjs";
import { getAuth } from "firebase/auth";
import { getFirebaseFunctionsEndpoint } from "../helpers/env";
import {
	createUserCreds,
	markUserAsSubscribed,
	signInWithCreds,
} from "../helpers/firebase";
import { setUp, tearDown } from "../helpers/setup";

beforeAll(setUp);
afterAll(tearDown);

const createMember = async () => {
	const creds = await createUserCreds();
	await signInWithCreds(creds);
	await markUserAsSubscribed();
	await invokeHandler("member/tryInitialize", {});
	await firemix().update(mixpath.members(creds.id), {
		plan: "free",
		isOnTrial: false,
	});
	return creds;
};

async function streamChat(
	name: string,
	input: Record<string, unknown>,
): Promise<LlmStreamEvent[]> {
	const user = getAuth().currentUser;
	if (!user) throw new Error("Not authenticated");
	const idToken = await user.getIdToken();

	const url = `${getFirebaseFunctionsEndpoint()}/streamHandler`;
	const res = await fetch(url, {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
			Authorization: `Bearer ${idToken}`,
		},
		body: JSON.stringify({ name, input }),
	});

	if (!res.ok) {
		throw new Error(`${res.status} ${await res.text()}`);
	}

	const text = await res.text();
	return text
		.split("\n")
		.filter((line) => line.trim())
		.map((line) => JSON.parse(line) as LlmStreamEvent);
}

describe("ai/streamChat", () => {
	it("streams simulated events and increments token count", async () => {
		const creds = await createMember();
		await firemix().update(mixpath.members(creds.id), {
			plan: "pro",
			tokensToday: 5,
			tokensThisMonth: 50,
			tokensTotal: 500,
			todayResetAt: firemix().timestampFromDate(
				dayjs().subtract(1, "day").toDate(),
			),
			thisMonthResetAt: firemix().timestampFromDate(
				dayjs().subtract(1, "month").toDate(),
			),
		});

		const events = await streamChat("ai/streamChat", {
			messages: [{ role: "user", content: "Hello" }],
			simulate: true,
		});

		expect(events).toHaveLength(2);
		expect(events[0]).toEqual({
			type: "text-delta",
			text: "Simulated stream response.",
		});
		expect(events[1]).toEqual({
			type: "finish",
			finishReason: "stop",
		});

		const member = await firemix().get(mixpath.members(creds.id));
		expect(member?.data.tokensToday).toBe(8);
		expect(member?.data.tokensThisMonth).toBe(53);
		expect(member?.data.tokensTotal).toBe(503);
	});

	it("rejects unauthenticated requests", async () => {
		const url = `${getFirebaseFunctionsEndpoint()}/streamHandler`;
		const res = await fetch(url, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({
				name: "ai/streamChat",
				input: {
					messages: [{ role: "user", content: "Hello" }],
					simulate: true,
				},
			}),
		});

		expect(res.status).toBe(401);
	});

	it("rejects invalid input", async () => {
		await createMember();

		const user = getAuth().currentUser;
		if (!user) throw new Error("Not authenticated");
		const idToken = await user.getIdToken();

		const url = `${getFirebaseFunctionsEndpoint()}/streamHandler`;
		const res = await fetch(url, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				Authorization: `Bearer ${idToken}`,
			},
			body: JSON.stringify({ name: "ai/streamChat", input: { messages: [] } }),
		});

		expect(res.status).toBe(400);
	});

	it("blocks access if the daily token limit is exceeded", async () => {
		const creds = await createMember();
		await firemix().update(mixpath.members(creds.id), {
			tokensToday: FULL_CONFIG.freeTokensPerDay,
			tokensThisMonth: 0,
			todayResetAt: firemix().timestampFromDate(dayjs().add(1, "day").toDate()),
			thisMonthResetAt: firemix().timestampFromDate(
				dayjs().add(1, "month").toDate(),
			),
		});

		await expect(
			streamChat("ai/streamChat", {
				messages: [{ role: "user", content: "Hello" }],
				simulate: true,
			}),
		).rejects.toThrow();
	});
});
