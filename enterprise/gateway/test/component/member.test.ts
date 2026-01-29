import { invoke } from "../helpers";

describe("member", () => {
  let token: string;

  beforeAll(async () => {
    const email = `member-test-${Date.now()}@example.com`;
    const data = await invoke("auth/register", {
      email,
      password: "password123",
    });
    token = data.token;
  });

  it("returns null for a new user with no member", async () => {
    const data = await invoke("member/getMyMember", {}, token);
    expect(data.member).toBeNull();
  });

  it("initializes a member via tryInitialize", async () => {
    const data = await invoke("member/tryInitialize", {}, token);
    expect(data).toEqual({});
  });

  it("returns the member after initialization", async () => {
    const data = await invoke("member/getMyMember", {}, token);

    expect(data.member).toBeDefined();
    expect(data.member.id).toBeDefined();
    expect(data.member.type).toBe("user");
    expect(data.member.plan).toBe("free");
    expect(data.member.wordsToday).toBe(0);
    expect(data.member.wordsThisMonth).toBe(0);
    expect(data.member.wordsTotal).toBe(0);
    expect(data.member.tokensToday).toBe(0);
    expect(data.member.tokensThisMonth).toBe(0);
    expect(data.member.tokensTotal).toBe(0);
    expect(data.member.createdAt).toBeDefined();
    expect(data.member.updatedAt).toBeDefined();
  });

  it("is idempotent on repeated tryInitialize", async () => {
    const data = await invoke("member/tryInitialize", {}, token);
    expect(data).toEqual({});

    const memberData = await invoke("member/getMyMember", {}, token);
    expect(memberData.member.plan).toBe("free");
  });

  it("rejects without auth token", async () => {
    await expect(invoke("member/getMyMember", {})).rejects.toThrow("401");
  });

  it("rejects tryInitialize without auth token", async () => {
    await expect(invoke("member/tryInitialize", {})).rejects.toThrow("401");
  });
});
