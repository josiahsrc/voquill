import { invokeHandler } from "@repo/functions";
import { PROMPT_LIMIT } from "@repo/types";
import { buildTone } from "../helpers/entities";
import {
	createUserCreds,
	markUserAsSubscribed,
	signInWithCreds,
} from "../helpers/firebase";
import { setUp, tearDown } from "../helpers/setup";

beforeAll(setUp);
afterAll(tearDown);

describe("api", () => {
	it("lets me manage my tones", async () => {
		const creds = await createUserCreds();
		await signInWithCreds(creds);
		await markUserAsSubscribed();

		const firstList = await invokeHandler("tone/listMyTones", {});
		expect(firstList.tones).toBeDefined();

		await invokeHandler("tone/upsertMyTone", {
			tone: buildTone({ id: "tone1", name: "Casual" }),
		});

		const secondList = await invokeHandler("tone/listMyTones", {});
		expect(secondList.tones.length).toBe(1);
		expect(secondList.tones[0]?.id).toBe("tone1");
		expect(secondList.tones[0]?.name).toBe("Casual");

		await invokeHandler("tone/upsertMyTone", {
			tone: buildTone({ id: "tone1", name: "Casual Updated" }),
		});

		const thirdList = await invokeHandler("tone/listMyTones", {});
		expect(thirdList.tones.length).toBe(1);
		expect(thirdList.tones[0]?.name).toBe("Casual Updated");

		await invokeHandler("tone/deleteMyTone", { toneId: "tone1" });

		const fourthList = await invokeHandler("tone/listMyTones", {});
		expect(fourthList.tones.length).toBe(0);
	});

	it("rejects promptTemplate longer than prompt limit", async () => {
		const creds = await createUserCreds();
		await signInWithCreds(creds);
		await markUserAsSubscribed();

		await expect(
			invokeHandler("tone/upsertMyTone", {
				tone: buildTone({
					promptTemplate: "a".repeat(PROMPT_LIMIT + 1),
				}),
			}),
		).rejects.toThrow(/String must contain at most 24000 character\(s\)/);
	});

	it("rejects systemPromptTemplate longer than prompt limit", async () => {
		const creds = await createUserCreds();
		await signInWithCreds(creds);
		await markUserAsSubscribed();

		await expect(
			invokeHandler("tone/upsertMyTone", {
				tone: buildTone({
					systemPromptTemplate: "a".repeat(PROMPT_LIMIT + 1),
				}),
			}),
		).rejects.toThrow(/String must contain at most 24000 character\(s\)/);
	});
});
