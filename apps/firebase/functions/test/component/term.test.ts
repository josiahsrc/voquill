import { invokeHandler } from "@repo/functions";
import { buildTerm } from "../helpers/entities";
import { createUserCreds, signInWithCreds } from "../helpers/firebase";
import { setUp, tearDown } from "../helpers/setup";

beforeAll(setUp);
afterAll(tearDown);

describe("api", () => {
  it("lets me manage my terms", async () => {
    const creds = await createUserCreds();
    await signInWithCreds(creds);

    const firstList = await invokeHandler("term/listMyTerms", {});
    expect(firstList.terms).toBeDefined();

    await invokeHandler("term/upsertMyTerm", { term: buildTerm({ id: "term1" }) });

    const secondList = await invokeHandler("term/listMyTerms", {});
    expect(secondList.terms.length).toBe(1);
    expect(secondList.terms[0]?.id).toBe("term1");

    await invokeHandler("term/deleteMyTerm", { termId: "term1" });

    const thirdList = await invokeHandler("term/listMyTerms", {});
    expect(thirdList.terms.length).toBe(0);
  });
});
