import { invoke } from "../helpers";

describe("config", () => {
  it("returns the full config", async () => {
    const data = await invoke("config/getFullConfig", {});
    expect(data.config).toBeDefined();
  });
});
