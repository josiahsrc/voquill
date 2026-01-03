import { createTool } from "@mastra/core/tools";
import { z } from "zod";
import { showToast } from "../actions/toast.actions";

export const consoleLogTool = createTool({
  id: "console_log",
  description: "Log a message to the console for debugging purposes",
  inputSchema: z.object({
    message: z.string().describe("The message to log to the console"),
  }),
  execute: async ({ message }) => {
    console.log("[Agent]", message);
    return { success: true, message };
  },
});

export const showToastTool = createTool({
  id: "show_toast",
  description: "Show a toast notification to the user",
  inputSchema: z.object({
    title: z.string().describe("The title of the toast notification"),
    message: z.string().describe("The message body of the toast notification"),
    type: z
      .enum(["info", "error"])
      .optional()
      .describe("The type of toast notification"),
  }),
  execute: async ({ title, message, type }) => {
    await showToast({
      title,
      message,
      toastType: type ?? "info",
    });
    return { success: true };
  },
});

export const stopTool = createTool({
  id: "stop",
  description:
    "End the conversation. Call this when the user wants to stop or says goodbye.",
  inputSchema: z.object({
    reason: z
      .string()
      .optional()
      .describe("Optional reason for ending the conversation"),
  }),
  execute: async ({ reason }) => {
    return { stopped: true, reason };
  },
});

export const agentTools = {
  console_log: consoleLogTool,
  show_toast: showToastTool,
  stop: stopTool,
};
