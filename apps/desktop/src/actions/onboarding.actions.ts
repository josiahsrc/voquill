import { produceAppState } from "../store";

export const advancePage = (delta = 1) => {
	produceAppState((draft) => {
		draft.onboarding.page += delta;
	});
};

export const submitOnboarding = async () => {
	// try {
	// 	produceAppState((draft) => {
	// 		draft.onboarding.submitting = true;
	// 	});

	// 	const id = getAppState().auth!.uid;
	// 	await blaze().set(path.users(id), {
	// 		id,
	// 		createdAt: blaze().now(),
	// 		updatedAt: blaze().now(),
	// 		name: getAppState().onboarding.name,
	// 		onboarded: false,
	// 		onboardedAt: null,
	// 	});
	// } catch (err) {
	// 	showErrorSnackbar(err);
	// } finally {
	// 	produceAppState((draft) => {
	// 		draft.onboarding.submitting = false;
	// 	});
	// }
};

export const finishOnboarding = async () => {
	// try {
	// 	await blaze().update(path.users(getAppState().auth!.uid), {
	// 		onboarded: true,
	// 		onboardedAt: blaze().now(),
	// 	});
	// } catch (err) {
	// 	showErrorSnackbar(err);
	// }
};
