import type { AuthContext } from "@repo/types";
import { z } from "zod";
import { getLicenseKey } from "./license-key.utils";
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

export function validateLicense(now: Date): void {
  const config = getLicenseKey();
  const issued = new Date(config.issued);
  const expires = new Date(config.expires);

  if (now < issued) {
    throw new ClientError("Enterprise license is not yet valid");
  }

  if (now >= expires) {
    throw new ClientError("Enterprise license has expired");
  }
}
