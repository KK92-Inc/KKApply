import { sql } from "bun";
import * as v from "valibot";
import { command, getRequestEvent, query } from "$app/server";
import type { UserEvent } from "$models";

export const start = command(v.pipe(v.string(), v.nonEmpty()), async (eventId) => {
	const { locals } = getRequestEvent();
	await sql`
		UPDATE user_event
		SET startedAt = datetime('now')
		WHERE id = (
			SELECT ue.id
			FROM user_event ue
			JOIN event e ON ue.eventId = e.id
			JOIN event_type et ON e.eventTypeId = et.id
			WHERE ue.userId = ${locals.session.userId}
			  AND e.id = ${eventId}
			  AND ue.startedAt IS NULL
			  AND (e.startsAt IS NULL OR e.startsAt < datetime('now'))
			LIMIT 1
		)
	`;
});

const registeredSchema = v.object({
	userId: v.pipe(v.string(), v.nonEmpty()),
	eventId: v.pipe(v.string(), v.nonEmpty()),
});
export const registered = query(registeredSchema, async ({ userId, eventId }) => {
	const [event] = await sql<UserEvent[]>`
		SELECT ue.*
		FROM user_event ue
		JOIN event e ON ue.eventId = e.id
		JOIN event_type et ON e.eventTypeId = et.id
		WHERE
			ue.userId = ${userId}
			AND e.id = ${eventId}
			AND (e.startsAt IS NULL OR e.startsAt < datetime('now'))
		LIMIT 1
	`;

	return event;
});
