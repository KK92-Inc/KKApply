import { query } from "$app/server";
import * as v from "valibot";
import type { User } from "$models";
import { sql } from "bun";
import { error } from "@sveltejs/kit";
import { UserFlag } from "$lib";

// ============================================================================

/** Get user by ID */
export const getUser = query(v.pipe(v.string(), v.uuid()), async (id) => {
	const [ user ] = await sql<User[]>`SELECT * FROM "user" WHERE id = ${id}`;
	return user ? user : error(404, 'User not found');
});

/** Checks if a user has admin privileges */
export const isAdmin = query(v.pipe(v.string(), v.uuid()), async (id) => {
	const user = await getUser(id);
	return (user.flags & UserFlag.IsAdmin) === UserFlag.IsAdmin;
});

// ============================================================================
