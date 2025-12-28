import { z } from "zod";
import { ClientError } from "./error.utils";

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
