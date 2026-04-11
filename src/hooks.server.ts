// ============================================================================
// W2Inc, 2025, All Rights Reserved.
// See README in the root project for more information.
// ============================================================================

import { building } from '$app/environment'
import type { Handle } from "@sveltejs/kit";
import { sql } from "bun";
import { sequence } from "@sveltejs/kit/hooks";

// ============================================================================

const init: Handle = async ({ event, resolve }) => {
	event.setHeaders({
		server: `Bun ${Bun.version}`,
		'x-app': 'KKApp'
	});

	const [ user ] = await sql`SELECT * FROM user`;
	console.log("user:", user);
	return resolve(event);
};

export const handle = sequence(init);
