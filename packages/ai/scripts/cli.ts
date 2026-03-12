/**
 * Interactive CLI to chat with the Voquill agent.
 *
 * Talks directly to the Mastra agent (no HTTP needed).
 * Streams responses to the terminal.
 *
 * Env vars:
 *   DESKTOP_API_URL — desktop API server URL (default: http://localhost:4112)
 *   DESKTOP_API_KEY — session API key (default: dev)
 */

import * as readline from "node:readline";
import { voquillAgent } from "../src/mastra/agents";

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

const messages: Array<{ role: "user" | "assistant"; content: string }> = [];

function prompt() {
  rl.question("\nyou: ", async (input) => {
    const trimmed = input.trim();
    if (!trimmed) return prompt();

    if (trimmed === "/quit" || trimmed === "/exit") {
      console.log("Bye!");
      rl.close();
      process.exit(0);
    }

    if (trimmed === "/clear") {
      messages.length = 0;
      console.log("(conversation cleared)");
      return prompt();
    }

    messages.push({ role: "user", content: trimmed });

    process.stdout.write("\nassistant: ");

    try {
      const response = await voquillAgent.stream(
        messages as Parameters<typeof voquillAgent.stream>[0]
      );

      let fullResponse = "";
      for await (const chunk of response.textStream) {
        process.stdout.write(chunk);
        fullResponse += chunk;
      }
      process.stdout.write("\n");

      messages.push({ role: "assistant", content: fullResponse });
    } catch (err) {
      console.error("\n[error]", err instanceof Error ? err.message : err);
    }

    prompt();
  });
}

console.log("Voquill AI Agent — Interactive CLI");
console.log(`LLM proxy: ${process.env.DESKTOP_API_URL || "http://localhost:4112"}`);
console.log("Commands: /clear, /quit\n");

prompt();
