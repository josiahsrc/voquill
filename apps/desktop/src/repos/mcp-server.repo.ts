import { McpServer, McpServerProvider } from "@repo/types";
import { invoke } from "@tauri-apps/api/core";
import dayjs from "dayjs";
import { BaseRepo } from "./base.repo";

type LocalMcpServer = {
  id: string;
  provider: string;
  name: string;
  url: string;
  enabled: boolean;
  createdAt: number;
  isAuthenticated: boolean;
  tokenExpiresAt?: number | null;
};

type LocalMcpServerCreateRequest = {
  id: string;
  provider: string;
  name: string;
  url: string;
};

type LocalMcpServerUpdateRequest = {
  id: string;
  name?: string | null;
  enabled?: boolean | null;
};

type MicrosoftAuthResult = {
  accessToken: string;
  refreshToken?: string | null;
  expiresIn: number;
};

const fromLocalMcpServer = (server: LocalMcpServer): McpServer => ({
  id: server.id,
  provider: server.provider as McpServerProvider,
  name: server.name,
  url: server.url,
  enabled: server.enabled,
  createdAt: dayjs(server.createdAt).toISOString(),
  isAuthenticated: server.isAuthenticated,
  tokenExpiresAt: server.tokenExpiresAt
    ? dayjs(server.tokenExpiresAt).toISOString()
    : null,
});

export abstract class BaseMcpServerRepo extends BaseRepo {
  abstract listMcpServers(): Promise<McpServer[]>;
  abstract createMcpServer(
    id: string,
    provider: McpServerProvider,
    name: string,
    url: string,
  ): Promise<McpServer>;
  abstract updateMcpServer(
    id: string,
    updates: { name?: string; enabled?: boolean },
  ): Promise<void>;
  abstract deleteMcpServer(id: string): Promise<void>;
  abstract getMcpServerToken(id: string): Promise<string>;
  abstract startMicrosoftOAuth(provider: McpServerProvider): Promise<MicrosoftAuthResult>;
  abstract setMcpServerTokens(
    id: string,
    accessToken: string,
    refreshToken: string | null,
    expiresIn: number,
  ): Promise<McpServer>;
}

export class LocalMcpServerRepo extends BaseMcpServerRepo {
  async listMcpServers(): Promise<McpServer[]> {
    const servers = await invoke<LocalMcpServer[]>("mcp_server_list");
    return servers.map(fromLocalMcpServer);
  }

  async createMcpServer(
    id: string,
    provider: McpServerProvider,
    name: string,
    url: string,
  ): Promise<McpServer> {
    const request: LocalMcpServerCreateRequest = { id, provider, name, url };
    const created = await invoke<LocalMcpServer>("mcp_server_create", {
      server: request,
    });
    return fromLocalMcpServer(created);
  }

  async updateMcpServer(
    id: string,
    updates: { name?: string; enabled?: boolean },
  ): Promise<void> {
    const request: LocalMcpServerUpdateRequest = {
      id,
      name: updates.name ?? null,
      enabled: updates.enabled ?? null,
    };
    await invoke<void>("mcp_server_update", { request });
  }

  async deleteMcpServer(id: string): Promise<void> {
    await invoke<void>("mcp_server_delete", { id });
  }

  async getMcpServerToken(id: string): Promise<string> {
    return invoke<string>("mcp_server_get_token", { id });
  }

  async startMicrosoftOAuth(provider: McpServerProvider): Promise<MicrosoftAuthResult> {
    return invoke<MicrosoftAuthResult>("start_microsoft_oauth", { provider });
  }

  async setMcpServerTokens(
    id: string,
    accessToken: string,
    refreshToken: string | null,
    expiresIn: number,
  ): Promise<McpServer> {
    const updated = await invoke<LocalMcpServer>("mcp_server_set_tokens", {
      id,
      accessToken,
      refreshToken,
      expiresIn,
    });
    return fromLocalMcpServer(updated);
  }
}
