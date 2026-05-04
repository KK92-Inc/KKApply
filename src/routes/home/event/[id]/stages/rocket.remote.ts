// ============================================================================
// W2Inc, 2025, All Rights Reserved.
// See README in the root project for more information.
// ============================================================================

import { error } from "@sveltejs/kit";
import * as Event from "$lib/remotes/event.remote";
import * as v from "valibot";
import { command, getRequestEvent, query } from "$app/server";
import { Generator } from "$lib/games/rocket.svelte";
import { id } from "$lib/remotes/schemas";
import { sql } from "bun";
import type { Level } from "$lib/games/rocket.svelte";

// ============================================================================

interface RocketStore {
	$type: "rocket";
	stages: {
		difficulty: number;
		solved: Level;
	}[];
}

function deepEquals(a: number[], b: number[]): boolean {
	return a.length === b.length && a.every((v, i) => v === b[i]);
}

// ============================================================================

/** Returns the current memory stage for the specified user event. */
export const current = query(id, async (userEventId) => {
	const { locals } = getRequestEvent();
	if (!await Event.entitled({ userEventId, userId: locals.session.userId })) {
		error(403);
	}

	const [row] = await sql<{ payload: string }[]>`
		SELECT payload FROM user_event_store
		WHERE userEventId = ${userEventId}
		LIMIT 1
	`;

	if (!row) { // No record yet — generate the initial stage and persist it.
		const stage = new Generator(locals.session.userId).generate(0.1);
		const data = { $type: "rocket", stages: [{ difficulty: 0.1, solved: stage }] } satisfies RocketStore;
		await sql`
			INSERT INTO user_event_store (id, userEventId, payload)
			VALUES (${Bun.randomUUIDv7()}, ${userEventId}, ${JSON.stringify(data)})
		`;

		return stage;
	}

	const store = JSON.parse(row.payload) as RocketStore;
	if (store.$type !== "rocket") {
		error(500, "Invalid stage payload");
	}

	return store.stages.at(-1)!;
});

// ============================================================================

const SubmitSchema = v.object({
	userEventId: id,
	sequence: v.array(v.number()),
});

/** Submits an answer for the current rocket stage. */
export const submit = command(SubmitSchema, async ({ userEventId, sequence }) => {
	const { locals } = getRequestEvent();
	if (!await Event.entitled({ userEventId, userId: locals.session.userId })) {
		error(403);
	}

	const [row] = await sql<{ payload: string }[]>`
		SELECT payload FROM user_event_store
		WHERE userEventId = ${userEventId}
		LIMIT 1
	`;

	// No record yet, shouldn't happen, but just generate the initial stage.
	if (!row) return await current(userEventId);

	const store = JSON.parse(row.payload) as RocketStore;
	if (store.$type !== "rocket") {
		error(500, "Invalid stage payload");
	}

	const stage = store.stages.at(-1) ?? error(500, "No active stage found");
	// if (!deepEquals(stage.sequence, sequence)) {
	// 	error(422, "Incorrect sequence");
	// }

	// Correct sequence — generate the next stage.
	const difficulty = Math.min(stage.difficulty + 0.1, 1);
	const next = new Generator(locals.session.userId).generate(difficulty);
	store.stages.push({ difficulty, solved: next });

	await sql`
		UPDATE user_event_store
		SET payload = ${JSON.stringify(store)},
		    updatedAt = strftime('%Y-%m-%dT%H:%M:%SZ', 'now')
		WHERE userEventId = ${userEventId}
	`;

	return next;
});
