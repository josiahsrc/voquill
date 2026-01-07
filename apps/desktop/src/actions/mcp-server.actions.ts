import { McpServer, McpServerProvider } from "@repo/types";
import dayjs from "dayjs";
import { v4 as uuidv4 } from "uuid";
import { getMcpServerRepo } from "../repos";
import { produceAppState } from "../store";
import { registerMcpServers } from "../utils/app.utils";
import { showErrorSnackbar } from "./app.actions";

const MCP_SERVER_CONFIGS: Record<
  McpServerProvider,
  { name: string; url: string }
> = {
  microsoft_graph: {
    name: "Microsoft Graph",
    url: "https://mcp.svc.cloud.microsoft/enterprise",
  },
};

const sortMcpServers = (servers: McpServer[]): McpServer[] =>
  [...servers].sort(
    (a, b) => dayjs(b.createdAt).valueOf() - dayjs(a.createdAt).valueOf(),
  );

export const loadMcpServers = async (): Promise<void> => {
  produceAppState((draft) => {
    draft.apps.status = "loading";
  });

  try {
    const servers = await getMcpServerRepo().listMcpServers();
    const sorted = sortMcpServers(servers);

    produceAppState((draft) => {
      registerMcpServers(draft, servers);
      draft.apps.mcpServerIds = sorted.map((s) => s.id);
      draft.apps.status = "success";
    });
  } catch (error) {
    console.error("Failed to load MCP servers", error);
    produceAppState((draft) => {
      draft.apps.status = "error";
    });
  }
};

export const addMcpServer = async (
  provider: McpServerProvider,
): Promise<McpServer | null> => {
  const config = MCP_SERVER_CONFIGS[provider];
  if (!config) {
    showErrorSnackbar(`Unknown MCP server provider: ${provider}`);
    return null;
  }

  try {
    const repo = getMcpServerRepo();
    const authResult = await repo.startMicrosoftOAuth(provider);

    const id = uuidv4();
    await repo.createMcpServer(id, provider, config.name, config.url);

    const authenticated = await repo.setMcpServerTokens(
      id,
      authResult.accessToken,
      authResult.refreshToken ?? null,
      authResult.expiresIn,
    );

    produceAppState((draft) => {
      registerMcpServers(draft, [authenticated]);
      const existing = draft.apps.mcpServerIds.filter((sid) => sid !== id);
      existing.unshift(id);
      draft.apps.mcpServerIds = existing;
    });

    return authenticated;
  } catch (error) {
    console.error("Failed to add MCP server", error);
    showErrorSnackbar(
      error instanceof Error ? error.message : "Failed to connect MCP server.",
    );
    return null;
  }
};

export const toggleMcpServer = async (
  id: string,
  enabled: boolean,
): Promise<void> => {
  try {
    await getMcpServerRepo().updateMcpServer(id, { enabled });

    produceAppState((draft) => {
      const server = draft.mcpServerById[id];
      if (server) {
        server.enabled = enabled;
      }
    });
  } catch (error) {
    console.error("Failed to toggle MCP server", error);
    showErrorSnackbar(
      error instanceof Error
        ? error.message
        : "Failed to update MCP server.",
    );
  }
};

export const deleteMcpServer = async (id: string): Promise<void> => {
  try {
    await getMcpServerRepo().deleteMcpServer(id);

    produceAppState((draft) => {
      delete draft.mcpServerById[id];
      draft.apps.mcpServerIds = draft.apps.mcpServerIds.filter(
        (sid) => sid !== id,
      );
    });
  } catch (error) {
    console.error("Failed to delete MCP server", error);
    showErrorSnackbar(
      error instanceof Error
        ? error.message
        : "Failed to delete MCP server.",
    );
  }
};

export const reconnectMcpServer = async (
  id: string,
): Promise<McpServer | null> => {
  try {
    const repo = getMcpServerRepo();
    const server = await repo.listMcpServers().then((servers) =>
      servers.find((s) => s.id === id),
    );

    if (!server) {
      showErrorSnackbar("MCP server not found.");
      return null;
    }

    const authResult = await repo.startMicrosoftOAuth(server.provider);

    const updated = await repo.setMcpServerTokens(
      id,
      authResult.accessToken,
      authResult.refreshToken ?? null,
      authResult.expiresIn,
    );

    produceAppState((draft) => {
      registerMcpServers(draft, [updated]);
    });

    return updated;
  } catch (error) {
    console.error("Failed to reconnect MCP server", error);
    showErrorSnackbar(
      error instanceof Error
        ? error.message
        : "Failed to reconnect MCP server.",
    );
    return null;
  }
};
