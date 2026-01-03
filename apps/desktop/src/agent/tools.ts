import { StructuredTool } from "@langchain/core/tools";
import { z } from "zod";
import { showToast } from "../actions/toast.actions";

export class StopTool extends StructuredTool {
  name = "stop";
  description =
    "Stops the current agent session and ends the conversation. Use this when the user wants to stop, exit, quit, end the conversation, or says goodbye.";

  schema = z.object({
    reason: z
      .string()
      .optional()
      .describe("Optional reason for stopping the session"),
  });

  private onStop: () => void;

  constructor(onStop: () => void) {
    super();
    this.onStop = onStop;
  }

  protected async _call(input: z.infer<typeof this.schema>): Promise<string> {
    this.onStop();
    return input.reason
      ? `Session ended: ${input.reason}`
      : "Session ended. Goodbye!";
  }
}

export class ShowToastTool extends StructuredTool {
  name = "show_toast";
  description =
    "Shows a toast notification to the user with a message. Use this to display information, confirmations, or alerts to the user.";

  schema = z.object({
    message: z
      .string()
      .describe("The message to display in the toast notification"),
    type: z
      .enum(["info"])
      .optional()
      .default("info")
      .describe("The type of toast notification (affects the visual style)"),
  });

  protected async _call(input: z.infer<typeof this.schema>): Promise<string> {
    const { message, type } = input;
    showToast({
      title: "Notification",
      message,
      toastType: type ?? "info",
    });
    return `Toast displayed: "${message}" (type: ${type ?? "info"})`;
  }
}

export type AgentToolHandlers = {
  onStop: () => void;
};

export function createAgentTools(handlers: AgentToolHandlers) {
  return [new StopTool(handlers.onStop), new ShowToastTool()];
}
