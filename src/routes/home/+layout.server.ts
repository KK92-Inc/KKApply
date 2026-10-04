import type { LayoutServerLoad } from "./$types";
import { getLocalTimeZone } from "@internationalized/date";

export const load: LayoutServerLoad = async ({ locals }) => {
	return {
		session: locals.session,
		tz: getLocalTimeZone()
	};
};
