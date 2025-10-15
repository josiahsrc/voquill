import { httpsCallable, getFunctions } from "firebase/functions";
import type { HandlerInput, HandlerName, HandlerOutput } from "./types";

export const invokeHandler = async <N extends HandlerName>(
	name: N,
	input: HandlerInput<N>
): Promise<HandlerOutput<N>> => {
	const callable = httpsCallable(getFunctions(), "handler");
	const result = await callable({ name, args: input });
	return result.data as HandlerOutput<N>;
};
