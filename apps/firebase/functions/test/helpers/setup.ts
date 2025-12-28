import { closeFirebase, initializeFirebase } from "./firebase";

export const setUp = async () => {
	try {
		await initializeFirebase();
	} catch (e) {
		console.error("Error during Firebase initialization in setUp:", e);
		throw e;
	}
};

export const tearDown = async () => {
	try {
		await closeFirebase();
	} catch (e) {
		console.error("Error during Firebase closure in tearDown:", e);
		throw e;
	}
};
