// ============================================================================
// W2Inc, 2025, All Rights Reserved.
// See README in the root project for more information.
// ============================================================================

import { redirect } from "@sveltejs/kit";
import * as Event from "$lib/remotes/event.remote";
import type { LayoutServerLoad } from "./$types";

// ============================================================================

export const load: LayoutServerLoad = async ({ params, locals }) => {
	const userEvent = await Event.getUserEvent({
		eventId: params.id,
		userId: locals.session.userId,
	});

	if (!userEvent || userEvent.completedAt)
		redirect(302, "/home");
};
