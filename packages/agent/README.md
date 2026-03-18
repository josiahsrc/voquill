# @repo/agent

Provider-agnostic agentic loop with tool support.

## Usage

```typescript
import { AgentLoop } from "@repo/agent";
import type { AgentLlmProvider, AgentTool } from "@repo/agent";

const provider: AgentLlmProvider = {
  async *streamChat(input) {
    // Implement with any LLM provider
  },
};

const tools: AgentTool[] = [
  {
    name: "my_tool",
    description: "Does something useful",
    parameters: { type: "object", properties: {} },
    async execute(params) {
      return { result: "done" };
    },
    requiresApproval: () => true, // optional
  },
];

const loop = new AgentLoop({
  provider,
  tools,
  systemPrompt: "You are a helpful assistant.",
  maxIterations: 20,
  onPermissionRequest: async (toolName, params) => {
    // Return true to allow, false to deny
    return true;
  },
});

for await (const event of loop.run([{ role: "user", content: "Hello" }])) {
  if (event.type === "text-delta") process.stdout.write(event.text);
  if (event.type === "finish") console.log("\nDone:", event.reason);
}
```

## Running the example

The example script is an interactive REPL with mock tools and a real terminal command tool.

```bash
# Build dependencies first
pnpm run build --filter=@repo/agent...

# Run the example
OPENAI_API_KEY=sk-... pnpm --filter @repo/agent run example
```

### Available tools in the example

| Tool | Real/Mock | Description |
|------|-----------|-------------|
| `execute_terminal_command` | Real | Runs shell commands (requires approval) |
| `read_accessibility_context` | Mock | Returns fake accessibility data |
| `paste_text` | Mock | Logs what would be pasted |
| `grab_screenshot` | Mock | Returns fake screenshot description |
