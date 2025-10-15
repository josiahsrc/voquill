import { closeFirebase, initializeFirebase } from "./firebase";

export const setUp = async () => {
	await initializeFirebase();
};

export const tearDown = async () => {
	await closeFirebase();
};
