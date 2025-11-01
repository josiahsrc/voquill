import { DeleteAccountAction } from "@repo/types";
import * as admin from "firebase-admin";

export const runDeleteAccountAction = async (
  action: DeleteAccountAction
): Promise<void> => {
  await admin.auth().deleteUser(action.userId);
};
