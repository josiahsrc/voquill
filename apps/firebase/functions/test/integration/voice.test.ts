import dayjs from "dayjs";
import * as fs from "fs";
import { blaze, invokeHandler, path } from "../../src/shared";
import { createUserCreds, signInWithCreds } from "../helpers/firebase";
import { setUp, tearDown } from "../helpers/setup";

beforeAll(setUp);
afterAll(tearDown);

const config = {
	freeWordsPerDay: 1000,
	freeWordsPerMonth: 10_000,
	proWordsPerDay: 10_000,
	proWordsPerMonth: 100_000,
};

const readBase64 = (filePath: string): string => {
	const audioBytes = fs.readFileSync(filePath);
	return audioBytes.toString("base64");
};

beforeAll(async () => {
	await blaze().set(path.systemConfig(), config);
});

beforeEach(async () => {
	const creds = await createUserCreds();
	await signInWithCreds(creds);
	await invokeHandler("member/tryInitialize", {});

	await blaze().update(path.members(creds.id), {
		wordsToday: config.freeWordsPerDay - 1,
		wordsThisMonth: config.freeWordsPerMonth - 1,
		wordsTodayResetAt: blaze().timestampFromDate(
			dayjs().subtract(1, "day").toDate()
		),
		wordsThisMonthResetAt: blaze().timestampFromDate(
			dayjs().subtract(1, "month").toDate()
		),
	});
});

describe("voice/transcribe", () => {
	it("works for the duck", async () => {
		const res = await invokeHandler("voice/transcribe", {
			audioBase64: readBase64("assets/the-duck.wav"),
			audioMimeType: "audio/wav",
		});

		console.log("the duck transcription:", res.text);
		expect(res.text).toBeDefined();
		expect(res.text.length).toBeGreaterThan(0);
		expect(res.text.toLowerCase()).toContain("swim");
		expect(res.text.toLowerCase()).toContain("duck");
		expect(res.text.toLowerCase()).toContain("lake");
	});

	it("works for test", async () => {
		const res = await invokeHandler("voice/transcribe", {
			audioBase64: readBase64("assets/test.wav"),
			audioMimeType: "audio/wav",
		});

		console.log("the test transcription:", res.text);
		expect(res.text).toBeDefined();
		expect(res.text.length).toBeGreaterThan(0);
		expect(res.text.toLowerCase()).toContain("test");
	});
});

describe("voice/compose", () => {
	it("works for the muffin man", async () => {
		const res = await invokeHandler("voice/compose", {
			audioBase64: readBase64("assets/muffin-man.wav"),
			audioMimeType: "audio/wav",
		});

		console.log("the muffin man composition:", res.text);
		expect(res.text).toBeDefined();
		expect(res.text.length).toBeGreaterThan(0);
		expect(res.text.toLowerCase()).toContain("muffin");
		expect(res.text.toLowerCase()).toContain("man");
	});

	it("reads context from the page", async () => {
		const res = await invokeHandler("voice/compose", {
			audioBase64: readBase64("assets/read-the-picture.wav"),
			audioMimeType: "audio/wav",
			pageScreenshotBase64: `data:image/png;base64,${readBase64(
				"assets/dont-sit-on-that.png"
			)}`,
		});

		console.log("read the picture composition:", res.text);
		expect(res.text).toBeDefined();
		expect(res.text.length).toBeGreaterThan(0);
		expect(res.text.toLowerCase()).toContain("pat");
		expect(res.text.toLowerCase()).toContain("sit");
		expect(res.text.toLowerCase()).toContain("that");
	});
});

describe("voice/transcribeDemo", () => {
	it("works for the duck demo", async () => {
		const clientId = `test-client-id-${Date.now()}`;
		const res = await invokeHandler("voice/transcribeDemo", {
			audioBase64: readBase64("assets/the-duck.wav"),
			audioMimeType: "audio/wav",
			clientId,
		});

		console.log("the duck transcription:", res.text);
		expect(res.text).toBeDefined();
		expect(res.text.length).toBeGreaterThan(0);
		expect(res.text.toLowerCase()).toContain("swim");
		expect(res.text.toLowerCase()).toContain("duck");
		expect(res.text.toLowerCase()).toContain("lake");

		// expect usage by client id to be within 1 second of 18 seconds
		const usage = await blaze().get(path.usageByBrowserId(clientId));
		const today = new Date().toISOString().split("T")[0];
		const usageToday = usage?.data.usage?.[today];
		expect(usageToday).toBeDefined();
		expect(usageToday?.seconds).toBeGreaterThanOrEqual(17);
		expect(usageToday?.seconds).toBeLessThanOrEqual(19);

		await expect(
			invokeHandler("voice/demoAvailable", {
				clientId,
			})
		).resolves.toEqual({
			available: true,
		});

		// update usage for the client id to 20,000 words
		await blaze().update(path.usageByBrowserId(clientId), {
			usage: {
				[today]: {
					seconds: usageToday?.seconds ?? 0,
					words: 20_000,
				},
			},
		});

		// expect duck to fail with word limit exceeded
		await expect(
			invokeHandler("voice/transcribeDemo", {
				audioBase64: readBase64("assets/the-duck.wav"),
				audioMimeType: "audio/wav",
				clientId,
			})
		).rejects.toThrow("You have exceeded your demo usage limit for today.");

		await expect(
			invokeHandler("voice/demoAvailable", {
				clientId,
			})
		).resolves.toEqual({
			available: false,
		});
	});
});

describe("voice/composeDemo", () => {
	it("works for the muffin man demo", async () => {
		const clientId = `test-client-id-${Date.now()}`;
		const res = await invokeHandler("voice/composeDemo", {
			audioBase64: readBase64("assets/muffin-man.wav"),
			audioMimeType: "audio/wav",
			clientId,
		});

		console.log("the muffin man composition:", res.text);
		expect(res.text).toBeDefined();
		expect(res.text.length).toBeGreaterThan(0);
		expect(res.text.toLowerCase()).toContain("muffin");
		expect(res.text.toLowerCase()).toContain("man");

		// expect usage by client id to be within 1 second of 18 seconds
		const usage = await blaze().get(path.usageByBrowserId(clientId));
		const today = new Date().toISOString().split("T")[0];
		const usageToday = usage?.data.usage?.[today];
		expect(usageToday).toBeDefined();
		expect(usageToday?.seconds).toBeGreaterThanOrEqual(12);
		expect(usageToday?.seconds).toBeLessThanOrEqual(14);

		await expect(
			invokeHandler("voice/demoAvailable", {
				clientId,
			})
		).resolves.toEqual({
			available: true,
		});

		// update usage for the client id to 20,000 words
		await blaze().update(path.usageByBrowserId(clientId), {
			usage: {
				[today]: {
					seconds: usageToday?.seconds ?? 0,
					words: 20_000,
				},
			},
		});

		// expect muffin man to fail with word limit exceeded
		await expect(
			invokeHandler("voice/composeDemo", {
				audioBase64: readBase64("assets/muffin-man.wav"),
				audioMimeType: "audio/wav",
				clientId,
			})
		).rejects.toThrow("You have exceeded your demo usage limit for today.");

		await expect(
			invokeHandler("voice/demoAvailable", {
				clientId,
			})
		).resolves.toEqual({
			available: false,
		});
	});
});
