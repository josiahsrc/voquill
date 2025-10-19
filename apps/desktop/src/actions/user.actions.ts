import { firemix } from "@firemix/client";
import { Nullable, User } from "@repo/types";
import { getUserRepo } from "../repos";
import { getAppState, produceAppState } from "../store";
import { registerUsers } from "../utils/app.utils";
import { getMyUser } from "../utils/user.utils";
import { showErrorSnackbar } from "./app.actions";

export const setPreferredMicrophone = async (
	preferredMicrophone: Nullable<string>,
) => {
	const state = getAppState();
	const existing = getMyUser(state);
	if (!existing) {
		showErrorSnackbar("Unable to update microphone preference. User not found.");
		return;
	}

	const trimmed = preferredMicrophone?.trim() ?? null;
	const normalized = trimmed && trimmed.length > 0 ? trimmed : null;
	const currentPreference = existing.preferredMicrophone ?? null;
	if (currentPreference === normalized) {
		return;
	}

	const repo = getUserRepo();
	const now = firemix().now();
	const payload: User = {
		...existing,
		updatedAt: now,
		preferredMicrophone: normalized,
	};

	try {
		const saved = await repo.setUser(payload);
		produceAppState((draft) => {
			registerUsers(draft, [saved]);
		});
	} catch (error) {
		console.error("Failed to update preferred microphone", error);
		showErrorSnackbar("Failed to save microphone preference. Please try again.");
		throw error;
	}
};
