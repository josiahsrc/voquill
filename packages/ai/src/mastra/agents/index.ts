import { Agent } from "@mastra/core/agent";
import { createSidecarLanguageModel } from "../../sidecar/model";
import { fetchTools } from "../tools";

export async function createVoquillAgent(conversationId: string) {
  let tools: Record<string, any> = {};
  try {
    tools = await fetchTools(conversationId);
    process.stderr.write(
      `[sidecar] Loaded ${Object.keys(tools).length} tools: ${Object.keys(tools).join(", ")}\n`,
    );
  } catch (err) {
    console.warn(
      "Could not fetch tools from sidecar host:",
      err instanceof Error ? err.message : err,
    );
  }

  return new Agent({
    id: "voquill-agent",
    name: "Voquill Assistant",
    instructions:
      "You are Voquill. You are a computer-use assistant that performs tasks on behalf of the user. IMPORTANT: Proactively call tools to satisfy the user's requests.",
    model: createSidecarLanguageModel(),
    tools,
  });
}
