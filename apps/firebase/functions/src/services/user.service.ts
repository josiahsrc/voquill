import { Nullable, User } from "../shared";
import { sendLoopsEvent, updateLoopsContact } from "../utils/loops.utils";

export const tryUpdateUserLoopsContact = async (args: {
	userId: string;
	before: Nullable<User>;
	after: Nullable<User>;
}) => {
	const prevName = args.before?.name;
	const newName = args.after?.name;
	if (prevName === newName) {
		return;
	}

	console.log("updating loops contact name for user", args.userId);
	await updateLoopsContact(args.userId);
};

export const trySendFinishedOnboardingEvent = async (args: {
	userId: string;
	before: Nullable<User>;
	after: Nullable<User>;
}) => {
	const prevOnboarded = args.before?.onboarded ?? false;
	const newOnboarded = args.after?.onboarded ?? false;
	if (prevOnboarded === newOnboarded || !newOnboarded) {
		return;
	}

	console.log("updating contact before sending finished onboarding event");
	await updateLoopsContact(args.userId);

	console.log("sending finished onboarding event for user", args.userId);
	await sendLoopsEvent({
		userId: args.userId,
		eventName: "finished-onboarding",
	});
};
