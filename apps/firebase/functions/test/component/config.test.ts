import { invokeHandler } from "@repo/functions";
import { signOutUser } from "../helpers/firebase";
import { setUp, tearDown } from "../helpers/setup";

beforeAll(setUp);
afterAll(tearDown);

describe("api", () => {
  it("always lets callers read the config", async () => {
    await signOutUser();
    const res = await invokeHandler("config/getFullConfig", {});
    expect(res.config).toBeDefined();
  });
});
