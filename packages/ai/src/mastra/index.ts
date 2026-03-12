import { Mastra } from "@mastra/core/mastra";
import { voquillAgent } from "./agents";

const port = Number(process.env.MASTRA_PORT) || 4111;

export const mastra = new Mastra({
  agents: { voquillAgent },
  server: {
    port,
    host: "localhost",
  },
});
