import type { AuthContext } from "@repo/types";
import { z } from "zod";
import { ClientError, UnauthorizedError } from "./error.utils";

export function requireAdmin(auth: AuthContext): void {
  if (!auth.isAdmin) {
    throw new UnauthorizedError("Admin access required");
  }
}

export const validateData = <T>(schema: z.ZodSchema<T>, data: unknown): T => {
  const parsed = schema.safeParse(data);
  if (!parsed.success) {
    const zodErrors = parsed.error.errors
      .map((err) => `${err.path.join(".")}: ${err.message}`)
      .join("; ");
    throw new ClientError(zodErrors);
  }
  return parsed.data;
};
