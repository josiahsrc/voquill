import { v4 as uuid } from "uuid";
import { invoke, query } from "../helpers";

describe("term", () => {
  let token: string;
  let termId1: string;
  let termId2: string;

  beforeAll(async () => {
    const email = `term-test-${Date.now()}@example.com`;
    const data = await invoke("auth/register", {
      email,
      password: "password123",
    });
    token = data.token;
    termId1 = uuid();
    termId2 = uuid();
  });

  it("returns empty list for a new user", async () => {
    const data = await invoke("term/listMyTerms", {}, token);
    expect(data.terms).toEqual([]);
  });

  it("creates a term via upsertMyTerm", async () => {
    await invoke(
      "term/upsertMyTerm",
      {
        term: {
          id: termId1,
          createdAt: new Date().toISOString(),
          sourceValue: "GPT",
          destinationValue: "ChatGPT",
          isReplacement: true,
        },
      },
      token,
    );

    const data = await invoke("term/listMyTerms", {}, token);
    expect(data.terms).toHaveLength(1);
    expect(data.terms[0].sourceValue).toBe("GPT");
    expect(data.terms[0].destinationValue).toBe("ChatGPT");
    expect(data.terms[0].isReplacement).toBe(true);
  });

  it("updates an existing term via upsertMyTerm", async () => {
    await invoke(
      "term/upsertMyTerm",
      {
        term: {
          id: termId1,
          createdAt: new Date().toISOString(),
          sourceValue: "GPT",
          destinationValue: "OpenAI ChatGPT",
          isReplacement: true,
        },
      },
      token,
    );

    const data = await invoke("term/listMyTerms", {}, token);
    expect(data.terms).toHaveLength(1);
    expect(data.terms[0].destinationValue).toBe("OpenAI ChatGPT");
  });

  it("creates a glossary term", async () => {
    await invoke(
      "term/upsertMyTerm",
      {
        term: {
          id: termId2,
          createdAt: new Date().toISOString(),
          sourceValue: "Voquill",
          destinationValue: "",
          isReplacement: false,
        },
      },
      token,
    );

    const data = await invoke("term/listMyTerms", {}, token);
    expect(data.terms).toHaveLength(2);
  });

  it("deletes a term", async () => {
    await invoke("term/deleteMyTerm", { termId: termId1 }, token);

    const data = await invoke("term/listMyTerms", {}, token);
    expect(data.terms).toHaveLength(1);
    expect(data.terms[0].id).toBe(termId2);
  });

  it("delete is idempotent for nonexistent term", async () => {
    await invoke("term/deleteMyTerm", { termId: "nonexistent" }, token);
  });

  it("rejects without auth token", async () => {
    await expect(invoke("term/listMyTerms", {})).rejects.toThrow("401");
  });

  describe("global terms", () => {
    let adminToken: string;
    let userToken: string;
    let globalTermId: string;

    beforeAll(async () => {
      const adminEmail = `global-term-admin-${Date.now()}@example.com`;
      const adminData = await invoke("auth/register", {
        email: adminEmail,
        password: "password123",
      });
      await query("UPDATE auth SET is_admin = TRUE WHERE id = $1", [adminData.auth.id]);
      const refreshed = await invoke("auth/login", {
        email: adminEmail,
        password: "password123",
      });
      adminToken = refreshed.token;

      const userEmail = `global-term-user-${Date.now()}@example.com`;
      const userData = await invoke("auth/register", {
        email: userEmail,
        password: "password123",
      });
      userToken = userData.token;

      globalTermId = uuid();

      await query("DELETE FROM terms WHERE is_global = TRUE");
    });

    it("rejects non-admin from listing global terms", async () => {
      await expect(
        invoke("term/listGlobalTerms", {}, userToken),
      ).rejects.toThrow("401");
    });

    it("rejects non-admin from upserting global terms", async () => {
      await expect(
        invoke(
          "term/upsertGlobalTerm",
          {
            term: {
              id: globalTermId,
              createdAt: new Date().toISOString(),
              sourceValue: "test",
              destinationValue: "test",
              isReplacement: false,
            },
          },
          userToken,
        ),
      ).rejects.toThrow("401");
    });

    it("rejects non-admin from deleting global terms", async () => {
      await expect(
        invoke("term/deleteGlobalTerm", { termId: globalTermId }, userToken),
      ).rejects.toThrow("401");
    });

    it("allows admin to create a global term", async () => {
      await invoke(
        "term/upsertGlobalTerm",
        {
          term: {
            id: globalTermId,
            createdAt: new Date().toISOString(),
            sourceValue: "Voquill",
            destinationValue: "Voquill Inc.",
            isReplacement: true,
          },
        },
        adminToken,
      );

      const data = await invoke("term/listGlobalTerms", {}, adminToken);
      expect(data.terms).toHaveLength(1);
      expect(data.terms[0].sourceValue).toBe("Voquill");
      expect(data.terms[0].destinationValue).toBe("Voquill Inc.");
      expect(data.terms[0].isReplacement).toBe(true);
    });

    it("allows admin to update a global term", async () => {
      await invoke(
        "term/upsertGlobalTerm",
        {
          term: {
            id: globalTermId,
            createdAt: new Date().toISOString(),
            sourceValue: "Voquill",
            destinationValue: "Voquill Corp.",
            isReplacement: true,
          },
        },
        adminToken,
      );

      const data = await invoke("term/listGlobalTerms", {}, adminToken);
      expect(data.terms).toHaveLength(1);
      expect(data.terms[0].destinationValue).toBe("Voquill Corp.");
    });

    it("includes global terms in listMyTerms for regular users", async () => {
      const data = await invoke("term/listMyTerms", {}, userToken);
      const globalTerm = data.terms.find((t: { id: string }) => t.id === globalTermId);
      expect(globalTerm).toBeDefined();
      expect(globalTerm.sourceValue).toBe("Voquill");
    });

    it("allows admin to delete a global term", async () => {
      await invoke("term/deleteGlobalTerm", { termId: globalTermId }, adminToken);

      const data = await invoke("term/listGlobalTerms", {}, adminToken);
      expect(data.terms).toHaveLength(0);
    });

    it("global term no longer appears in listMyTerms after deletion", async () => {
      const data = await invoke("term/listMyTerms", {}, userToken);
      const globalTerm = data.terms.find((t: { id: string }) => t.id === globalTermId);
      expect(globalTerm).toBeUndefined();
    });

    it("rejects without auth token", async () => {
      await expect(invoke("term/listGlobalTerms", {})).rejects.toThrow("401");
    });
  });
});
