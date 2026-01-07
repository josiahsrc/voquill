export const MCP_SERVER_PROVIDERS = ["microsoft_graph"] as const;
export type McpServerProvider = (typeof MCP_SERVER_PROVIDERS)[number];

export type McpServer = {
  id: string;
  provider: McpServerProvider;
  name: string;
  url: string;
  enabled: boolean;
  createdAt: string;
  isAuthenticated: boolean;
  tokenExpiresAt?: string | null;
};
