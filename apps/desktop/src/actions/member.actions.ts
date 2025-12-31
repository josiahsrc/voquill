import { invokeHandler } from "@repo/functions";
import { listify } from "@repo/utilities";
import { getAppState, produceAppState } from "../store";
import { registerMembers } from "../utils/app.utils";

export async function refreshMember(): Promise<void> {
  const state = getAppState();
  const userId = state.auth?.uid;
  if (!userId) {
    return;
  }

  try {
    const res = await invokeHandler("member/getMyMember", {});
    const member = res.member;
    produceAppState((draft) => {
      registerMembers(draft, listify(member));
    });
  } catch {
    // No-op on failure
  }
}
