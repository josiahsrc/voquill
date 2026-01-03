import { z } from "zod";

export const ShowToastParamsSchema = z.object({
  title: z.string().describe("The title of the toast notification"),
  message: z.string().describe("The message body of the toast notification"),
});
export type ShowToastParams = z.infer<typeof ShowToastParamsSchema>;

export const StopParamsSchema = z.object({
  reason: z
    .string()
    .describe("Brief explanation for why the session is ending"),
});
export type StopParams = z.infer<typeof StopParamsSchema>;

export const GetAccessibilityInfoParamsSchema = z.object({});
export type GetAccessibilityInfoParams = z.infer<
  typeof GetAccessibilityInfoParamsSchema
>;

export const WriteToTextFieldParamsSchema = z.object({
  text: z.string().describe("The text to write to the focused text field"),
});
export type WriteToTextFieldParams = z.infer<
  typeof WriteToTextFieldParamsSchema
>;

export const ToolParamsSchema = z.union([
  ShowToastParamsSchema,
  StopParamsSchema,
  GetAccessibilityInfoParamsSchema,
  WriteToTextFieldParamsSchema,
]);
export type ToolParams = z.infer<typeof ToolParamsSchema>;

export const TypedToolCallSchema = z.discriminatedUnion("name", [
  z.object({
    name: z.literal("show_toast"),
    arguments: ShowToastParamsSchema,
  }),
  z.object({
    name: z.literal("stop"),
    arguments: StopParamsSchema,
  }),
  z.object({
    name: z.literal("get_accessibility_info"),
    arguments: GetAccessibilityInfoParamsSchema,
  }),
  z.object({
    name: z.literal("write_to_text_field"),
    arguments: WriteToTextFieldParamsSchema,
  }),
]);
export type TypedToolCall = z.infer<typeof TypedToolCallSchema>;
