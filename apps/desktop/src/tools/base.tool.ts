import { z } from "zod";
import zodToJsonSchema from "zod-to-json-schema";
import type { ToolResult } from "../types/agent.types";

export abstract class BaseTool {
  abstract readonly name: string;
  abstract readonly description: string;
  abstract readonly parametersSchema: z.ZodType;

  abstract execute(args: Record<string, unknown>): Promise<ToolResult>;

  getParametersJsonSchema(): Record<string, unknown> {
    const schema = zodToJsonSchema(this.parametersSchema, "Parameters");
    return (schema.definitions?.Parameters as Record<string, unknown>) ?? {};
  }

  toPromptString(): string {
    const jsonSchema = this.getParametersJsonSchema();
    return `Tool: ${this.name}
Description: ${this.description}
Parameters: ${JSON.stringify(jsonSchema, null, 2)}`;
  }
}
