import { Mastra } from "@mastra/core/mastra";
import { createVoquillAgent } from "./agents";

const port = Number(process.env.MASTRA_PORT) || 4111;

const voquillAgent = await createVoquillAgent();

export const mastra = new Mastra({
  agents: { voquillAgent },
  server: {
    port,
    host: "localhost",
  },
});
