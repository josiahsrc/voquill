import * as readline from "readline";
import { exec } from "child_process";
import { promisify } from "util";
import type { LlmMessage } from "@repo/types";
import { openaiStreamChat } from "@repo/voice-ai";
import { AgentLoop } from "../src/agent-loop";
import type { AgentLlmProvider, AgentTool } from "../src/types";

const execAsync = promisify(exec);

const API_KEY = process.env.OPENAI_API_KEY;
if (!API_KEY) {
  console.error("Set OPENAI_API_KEY environment variable");
  process.exit(1);
}

const provider: AgentLlmProvider = {
  async *streamChat(input) {
    yield* openaiStreamChat({
      apiKey: API_KEY!,
      model: "gpt-5.4",
      input,
    });
  },
};

// --- Helpers ---

let rl: readline.Interface;

function confirm(message: string): Promise<boolean> {
  return new Promise((resolve) => {
    rl.question(`  ${message} [y/n] `, (answer) => {
      resolve(answer.trim().toLowerCase() !== "n");
    });
  });
}

// --- Tools ---

const readAccessibilityContext: AgentTool = {
  name: "read_accessibility_context",
  description:
    "Read the content of the user's currently focused text field, including the text, cursor position, and selection. Also returns the name of the focused application. Call this first whenever the user refers to something they're looking at or working on.",
  parameters: { type: "object", properties: {} },
  async execute() {
    return {
      success: true,
      result: {
        textContent:
          "Hot take: TypeScript is just Java with better marketing. Fight me.\n\n👍 142  💬 87  🔄 23",
        cursorPosition: 0,
        selectionLength: 0,
        screenContext: "LinkedIn — Feed — Google Chrome",
      },
    };
  },
};

const pasteText: AgentTool = {
  name: "paste_text",
  description:
    "Type text into the user's currently focused text field. This is how you deliver written content to the user — when they ask you to write, draft, or compose something and they're in a text field, use this tool to put it there directly instead of just displaying it.",
  parameters: {
    type: "object",
    properties: {
      text: { type: "string", description: "The text to type into the focused field" },
    },
    required: ["text"],
  },
  async execute({ params }) {
    console.log(`\n  [Mock paste]: "${params.text}"`);
    return { success: true };
  },
};

const grabScreenshot: AgentTool = {
  name: "grab_screenshot",
  description:
    "Capture and analyze the user's current screen. Returns a description of visible UI elements, windows, and content. Use this when you need visual context beyond the focused text field — for example, to see a post in a browser, an image, or the overall layout.",
  parameters: { type: "object", properties: {} },
  async execute() {
    return {
      success: true,
      result: {
        description:
          "Google Chrome is open to LinkedIn. A post by Sarah Chen (Senior Engineer at Stripe) reads: 'Hot take: TypeScript is just Java with better marketing. Fight me.' with 142 likes, 87 comments, and 23 reposts. The comment box is focused and empty, ready for a reply.",
        width: 1920,
        height: 1080,
      },
    };
  },
};

const executeTerminalCommand: AgentTool = {
  name: "execute_terminal_command",
  description:
    "Execute a terminal command and return its output. Use this for file operations, running scripts, checking system state, etc.",
  parameters: {
    type: "object",
    properties: {
      command: { type: "string", description: "The shell command to execute" },
    },
    required: ["command"],
  },
  async execute({ params, reason }) {
    const command = params.command as string;
    const allowed = await confirm(`Execute "${command}"?\n  Reason: ${reason}`);
    if (!allowed) {
      return { success: false, failureReason: "User denied the command." };
    }
    try {
      const { stdout, stderr } = await execAsync(command, { timeout: 30000 });
      return {
        success: true,
        result: { stdout: stdout.trim(), stderr: stderr.trim(), exitCode: 0 },
      };
    } catch (err: unknown) {
      const e = err as { stdout?: string; stderr?: string; message?: string; code?: number };
      return {
        success: false,
        failureReason: e.stderr?.trim() ?? e.message ?? "Command failed",
      };
    }
  },
};

const tools: AgentTool[] = [
  readAccessibilityContext,
  pasteText,
  grabScreenshot,
  executeTerminalCommand,
];

const systemPrompt = `You are an autonomous assistant running on the user's desktop. You have direct access to their screen, focused text field, and system. You are not a chatbot — you are an agent that takes action.

Your workflow:
1. Gather context: When the user refers to something on screen ("this", "that post", "this email"), read it using your tools. Never ask the user to paste or describe what they're looking at.
2. Do the work: Accomplish the task fully — write the text, run the command, make the change.
3. Deliver the result: If the user is in a text field and asked you to write/draft/compose something, paste it directly into their field using paste_text. Don't just show them the output — put it where it needs to go.

Rules:
- Be autonomous. Complete the full task without asking unnecessary follow-up questions.
- Use multiple tools in sequence when needed. Read context, do the work, deliver the result.
- If a tool fails, try a different approach.
- Be concise.`;

// --- Interactive REPL ---

rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

const conversationHistory: LlmMessage[] = [];

async function chat(userMessage: string) {
  conversationHistory.push({ role: "user", content: userMessage });

  const loop = new AgentLoop({
    provider,
    tools,
    systemPrompt,
    maxIterations: 20,
  });

  for await (const event of loop.run(conversationHistory)) {
    switch (event.type) {
      case "text-delta":
        process.stdout.write(event.text);
        break;
      case "tool-call-start":
        console.log(
          `\n  [${event.toolName}]`,
          JSON.stringify(event.args).substring(0, 120),
        );
        break;
      case "tool-call-result":
        if (event.isError) {
          console.log(`  [Error]`, event.result.substring(0, 200));
        } else {
          console.log(`  [Result]`, event.result.substring(0, 200));
        }
        break;
      case "finish":
        console.log();
        conversationHistory.length = 0;
        conversationHistory.push(...event.messages);
        break;
    }
  }
}

function prompt() {
  rl.question("\nyou: ", async (input) => {
    const trimmed = input.trim();
    if (!trimmed || trimmed === "exit") {
      rl.close();
      return;
    }
    await chat(trimmed);
    prompt();
  });
}

console.log("Agent REPL (type 'exit' to quit)\n");
prompt();
