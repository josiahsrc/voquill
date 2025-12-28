import * as admin from "firebase-admin";

export const clearRateLimits = async (): Promise<void> => {
	const ref = admin.database().ref("limits");
	await ref.remove();
};
