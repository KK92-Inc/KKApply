// ============================================================================
// W2Inc, 2025, All Rights Reserved.
// See README in the root project for more information.
// ============================================================================

import { error, redirect } from "@sveltejs/kit";
import * as User from "$lib/remotes/user.remote";
import type { LayoutServerLoad } from "./$types";
import { sql } from "bun";

// ============================================================================

export const load: LayoutServerLoad = async ({ params }) => {
	// Is the user registered for this stage, and is it not expired?
	const userEvent = await User.registered(params.name);
	console.log("User event for stage", params.name, ":", userEvent);
	if (!userEvent || userEvent.completedAt)
		redirect(302, "/home");
	return { userEvent };
};
