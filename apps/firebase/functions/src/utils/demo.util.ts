import { blaze, path } from "../shared";
import { ClientError } from "./error.utils";
import { CallableRequest } from "firebase-functions/v2/https";
import { HandlerRequest } from "..";

export const validateDemoUsageWithinLimits = async (args: {
	browserId: string;
	ip: string;
}): Promise<void> => {
	const [ipUsage, browserUsage] = await Promise.all([
		blaze().get(path.usageByIp(args.ip)),
		blaze().get(path.usageByBrowserId(args.browserId)),
	]);

	if (ipUsage) {
		const today = new Date().toISOString().split("T")[0];
		const usageToday = ipUsage.data.usage[today] || { seconds: 0, words: 0 };
		if (usageToday.seconds >= 2 * 60 * 60) {
			// 2 hour limit
			throw new ClientError(
				"Your public IP Address has exceeded your demo usage limit for today."
			);
		}
		if (usageToday.words >= 50_000) {
			throw new ClientError(
				"Your public IP Address has exceeded your demo usage limit for today."
			);
		}
	}

	if (browserUsage) {
		const today = new Date().toISOString().split("T")[0];
		const usageToday = browserUsage.data.usage[today] || {
			seconds: 0,
			words: 0,
		};
		if (usageToday.words >= 1_000) {
			throw new ClientError(
				"You have exceeded your demo usage limit for today."
			);
		}
		if (usageToday.seconds >= 60 * 5) {
			// 1 hour limit
			throw new ClientError(
				"You have exceeded your demo usage limit for today."
			);
		}
	}
};

export const incrementDemoUsage = async (args: {
	browserId: string;
	ip: string;
	seconds: number;
	words: number;
}): Promise<void> => {
	const [ipUsage, browserUsage] = await Promise.all([
		blaze().get(path.usageByIp(args.ip)),
		blaze().get(path.usageByBrowserId(args.browserId)),
	]);

	const today = new Date().toISOString().split("T")[0];

	const ipUsageDataToday = ipUsage?.data.usage?.[today] || {
		seconds: 0,
		words: 0,
	};
	const browserUsageDataToday = browserUsage?.data.usage?.[today] || {
		seconds: 0,
		words: 0,
	};

	ipUsageDataToday.seconds += args.seconds;
	ipUsageDataToday.words += args.words;
	browserUsageDataToday.seconds += args.seconds;
	browserUsageDataToday.words += args.words;

	const updatedIpUsage = {
		...ipUsage?.data,
		usage: {
			...ipUsage?.data.usage,
			[today]: ipUsageDataToday,
		},
	};
	const updatedBrowserUsage = {
		...browserUsage?.data,
		usage: {
			...browserUsage?.data.usage,
			[today]: browserUsageDataToday,
		},
	};

	await Promise.all([
		blaze().set(path.usageByIp(args.ip), updatedIpUsage),
		blaze().set(path.usageByBrowserId(args.browserId), updatedBrowserUsage),
	]);
};

export const getClientIp = (req: CallableRequest<HandlerRequest>): string => {
	const forwarded = req.rawRequest.headers["x-forwarded-for"];

	if (typeof forwarded === "string") {
		// Case: single IP string
		return forwarded.split(",")[0].trim();
	} else if (Array.isArray(forwarded)) {
		// Case: array of IPs (very rare)
		return forwarded[0].trim();
	}

	// Fallback to socket IP
	return req.rawRequest.socket?.remoteAddress || "unknown";
};
