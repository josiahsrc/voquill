import { z } from "zod";
import zodToJsonSchema from "zod-to-json-schema";
import type { ToolResult } from "../types/agent.types";

export abstract class BaseTool<
  TInput extends z.ZodType = z.ZodType,
  TOutput extends z.ZodType = z.ZodType,
> {
  abstract readonly name: string;
  abstract readonly description: string;
  abstract readonly inputSchema: TInput;
  abstract readonly outputSchema: TOutput;

  protected abstract execInternal(args: z.infer<TInput>): Promise<ToolResult>;

  async execute(args: unknown): Promise<ToolResult> {
    const parseResult = this.inputSchema.safeParse(args);

    if (!parseResult.success) {
      return {
        success: false,
        output: {
          error: `Invalid parameters for ${this.name}: ${parseResult.error.message}`,
        },
      };
    }

    try {
      return await this.execInternal(parseResult.data);
    } catch (error) {
      return {
        success: false,
        output: { error: `Tool execution error: ${String(error)}` },
      };
    }
  }

  getInputJsonSchema(): Record<string, unknown> {
    const schema = zodToJsonSchema(this.inputSchema, "Input");
    return (schema.definitions?.Input as Record<string, unknown>) ?? schema;
  }

  getOutputJsonSchema(): Record<string, unknown> {
    const schema = zodToJsonSchema(this.outputSchema, "Output");
    return (schema.definitions?.Output as Record<string, unknown>) ?? schema;
  }

  parseOutput(result: unknown): z.infer<TOutput> {
    return this.outputSchema.parse(result);
  }

  toPromptString(): string {
    const inputJsonSchema = this.getInputJsonSchema();
    return `Tool: ${this.name}
Description: ${this.description}
Parameters: ${JSON.stringify(inputJsonSchema, null, 2)}`;
  }
}
