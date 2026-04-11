// ============================================================================
// W2Inc, 2025, All Rights Reserved.
// See README in the root project for more information.
// ============================================================================

import { building, dev } from '$app/environment'
import type { Handle, ServerInit } from "@sveltejs/kit";
import { sql } from "bun";
import { sequence } from "@sveltejs/kit/hooks";
import type { User, Session } from '$models';

// ============================================================================

export const init: ServerInit = async () => {
	if (building) return;

	// Enable common pragmas for better performance and reliability
	await sql`PRAGMA journal_mode = WAL;`;
	await sql`PRAGMA synchronous = NORMAL;`;
	if (!dev) await sql`PRAGMA locking_mode = EXCLUSIVE;`;
	await sql`PRAGMA temp_store = MEMORY;`;
	await sql`PRAGMA mmap_size = 8589934592;`; // 8GB
}

// ============================================================================

const begin: Handle = async ({ event, resolve }) => {
	event.setHeaders({
		server: `Bun ${Bun.version}`,
		'x-app': 'KKApp'
	});

	return resolve(event);
};

export const session: Handle = async ({ event, resolve }) => {
	const sessionId = event.cookies.get('session');
	const isUnauthorizedPath = event.url.pathname === '/' || event.url.pathname.startsWith('/token');

	if (!sessionId && !isUnauthorizedPath) {
		return Response.redirect('/', 303);
	} else if (sessionId) {
		const [row] = await sql<(Session & { user: User })[]>`
			SELECT s.*, u.* FROM session s
			JOIN "user" u ON u.id = s."userId"
			WHERE s.id = ${sessionId}
				AND s."expiresAt" > (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
		`;

		if (row) {
			event.locals.user = row.user;
			event.locals.session = row;
			if (isUnauthorizedPath) {
				return Response.redirect('/home', 303);
			}
		} else {
			event.cookies.delete('session', { path: '/' });
			return Response.redirect('/', 303);
		}
	}

	return resolve(event);
};

export const handle = sequence(begin, session);
