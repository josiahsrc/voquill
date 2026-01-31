import { listify } from "@repo/utilities";
import { getMemberRepo } from "../repos";
import { getAppState, produceAppState } from "../store";
import { registerMembers } from "../utils/app.utils";

export async function refreshMember(): Promise<void> {
  const state = getAppState();
  const userId = state.auth?.uid;
  if (!userId) {
    return;
  }

  try {
    const member = await getMemberRepo().getMyMember();
    produceAppState((draft) => {
      registerMembers(draft, listify(member));
    });
  } catch {
    // No-op on failure
  }
}
