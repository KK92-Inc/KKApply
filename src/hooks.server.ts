// ============================================================================
// W2Inc, 2025, All Rights Reserved.
// See README in the root project for more information.
// ============================================================================

import { building, dev } from '$app/environment'
import type { Handle, ServerInit } from "@sveltejs/kit";
import { sql } from "bun";
import { sequence } from "@sveltejs/kit/hooks";
import type { User, Session } from '$models';
import { logger } from '$lib/logger';

// ============================================================================

export const init: ServerInit = async () => {
	if (building) return;

	// Enable common pragmas for better performance and reliability
	logger.info('Starting...');
	await sql`PRAGMA journal_mode = WAL;`;
	await sql`PRAGMA synchronous = NORMAL;`;
	if (!dev) await sql`PRAGMA locking_mode = EXCLUSIVE;`;
	await sql`PRAGMA temp_store = MEMORY;`;
	await sql`PRAGMA mmap_size = 8589934592;`; // 8GB

	// Every 15 minutes, delete expired sessions
	Bun.cron("*/15 * * * *", async () => {
		await sql`
			DELETE FROM session
			WHERE "expiresAt" <= (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
		`;
		logger.info(`Session cleanup completed.`);
	});
}
// ============================================================================

const begin: Handle = async ({ event, resolve }) => {
	event.setHeaders({
		server: `Bun ${Bun.version}`,
		'x-app': 'KKApply',
		'x-powered-by': 'W2Inc'
	});

	return resolve(event);
};

export const session: Handle = async ({ event, resolve }) => {
	const sessionId = event.cookies.get('session');
	const isUnauthorizedPath = event.url.pathname === '/' || event.url.pathname.startsWith('/token');

	logger.debug(`Incoming request for ${event.url.pathname} with session ID: ${sessionId}`);
	if (!sessionId && !isUnauthorizedPath) {
		return Response.redirect('/', 303);
	} else if (sessionId) {
		const [row] = await sql<Session[]>`
			SELECT s.* FROM session s WHERE s.id = ${sessionId}
			AND s."expiresAt" > (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
		`;

		if (row) {
			event.locals.session = row;
			if (isUnauthorizedPath) {
				logger.debug(`Redirecting user to /home`);
				return Response.redirect('/home', 303);
			}
		} else {
			logger.debug(`Invalid session detected. Redirecting to /`);
			event.cookies.delete('session', { path: '/' });
			return Response.redirect('/', 303);
		}
	}

	return resolve(event);
};

export const handle = sequence(begin, session);
