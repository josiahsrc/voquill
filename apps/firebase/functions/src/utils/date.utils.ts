import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";

dayjs.extend(utc);
dayjs.extend(timezone);

export const dayjsForTimezone = (
	timezone: string,
	date?: string | Date
): dayjs.Dayjs => {
	return dayjs(date).tz(timezone);
};
