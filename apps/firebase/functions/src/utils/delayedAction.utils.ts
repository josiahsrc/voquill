import * as admin from "firebase-admin";
import { DeleteAccountAction } from "../shared";

export const runDeleteAccountAction = async (
	action: DeleteAccountAction
): Promise<void> => {
	await admin.auth().deleteUser(action.userId);
};
