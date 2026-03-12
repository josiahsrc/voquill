import { Agent } from "@mastra/core/agent";
import { createOpenAI } from "@ai-sdk/openai";

const desktopApiUrl =
  process.env.DESKTOP_API_URL || "http://localhost:4112";
const desktopApiKey = process.env.DESKTOP_API_KEY || "dev";

const provider = createOpenAI({
  baseURL: `${desktopApiUrl}/v1`,
  apiKey: desktopApiKey,
});

export const voquillAgent = new Agent({
  id: "voquill-agent",
  name: "Voquill Assistant",
  instructions:
    "You are Voquill's AI writing assistant. You help users with their writing, answer questions, and assist with tasks. Be concise, helpful, and friendly.",
  model: provider("default"),
});
