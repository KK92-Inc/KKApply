// ============================================================================
// W2Inc, 2025, All Rights Reserved.
// See README in the root project for more information.
// ============================================================================

import { building, dev } from '$app/environment'
import type { Handle, ServerInit } from "@sveltejs/kit";
import { sequence } from "@sveltejs/kit/hooks";
import type { User, Session } from '$models';
import { logger } from '$lib/logger';
import { sql, UserFlag } from '$lib';

// ============================================================================

export const init: ServerInit = async () => {
	if (building) return;

	logger.info('Starting...');
	await sql`PRAGMA journal_mode = WAL;`;
	await sql`PRAGMA synchronous = NORMAL;`;
	if (!dev) await sql`PRAGMA locking_mode = EXCLUSIVE;`;
	await sql`PRAGMA temp_store = MEMORY;`;
	await sql`PRAGMA mmap_size = 8589934592;`;

	Bun.cron("*/5 * * * *", async () => {
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

	if (sessionId) {
		const [row] = await sql<Session[]>`
      SELECT s.* FROM session s WHERE s.id = ${sessionId}
      AND s."expiresAt" > (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
    `;

		if (row) {
			event.locals.session = row;
			if (isUnauthorizedPath) {
				logger.debug(`Redirecting user to /home`);
				return Response.redirect(new URL('/home', event.url), 303);
			}
		} else {
			// FIX 1: Delete invalid cookie and ALLOW execution to continue if already on `/`
			logger.debug(`Invalid session detected. Deleting cookie.`);
			event.cookies.delete('session', { path: '/' });

			if (!isUnauthorizedPath) {
				return Response.redirect(new URL('/', event.url), 303);
			}
		}
	} else if (!isUnauthorizedPath) {
		return Response.redirect(new URL('/', event.url), 303);
	}

	return resolve(event);
};

export const authorized: Handle = async ({ event, resolve }) => {
	const session = event.locals.session;
	if (session) {
		const [user] = await sql<User[]>`SELECT * FROM "user" WHERE id = ${session.userId}`;

		if (user?.banned) {
			await sql`DELETE FROM session WHERE id = ${session.id}`;
			event.cookies.delete('session', { path: '/' });
			return new Response("Your account has been banned from Apply.", {
				status: 403,
				headers: {
					'Set-Cookie': 'session=; Path=/; Max-Age=0; HttpOnly; SameSite=Lax'
				}
			});
		}

		if (event.url.pathname.startsWith('/home/admin')) {
			const isAdmin = ((user?.flags ?? 0) & UserFlag.IsAdmin) === UserFlag.IsAdmin;
			if (!isAdmin) {
				return new Response(null, { status: 404 });
			}
		}
	}

	return resolve(event);
};

export const handle = sequence(begin, session, authorized);
