import { query, command } from '$app/server';
import { getRequestEvent } from '$app/server';
import * as v from 'valibot';
import type { User, UserEvent } from '$models';
import { sql } from 'bun';
import { error, invalid } from '@sveltejs/kit';
import { UserFlag } from '$lib';
import * as Date from '@internationalized/date';

// ============================================================================

/** Get user by ID */
export const get = query(v.pipe(v.string(), v.nonEmpty()), async (id) => {
	const [user] = await sql<User[]>`SELECT * FROM "user" WHERE id = ${id}`;
	return user ? user : error(404, 'User not found');
});
