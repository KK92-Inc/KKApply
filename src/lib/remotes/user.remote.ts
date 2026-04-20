import { query, command } from '$app/server';
import { getRequestEvent } from '$app/server';
import * as v from 'valibot';
import type { User, UserEvent } from '$models';
import { sql } from 'bun';
import { error, invalid } from '@sveltejs/kit';
import { UserFlag } from '$lib';
import * as Date from '@internationalized/date';

// ============================================================================

export interface EventWithUserInfo {
	id: string;
	name: string;
	description: string;
	startsAt: string | null;
	registerUntil: string | null;
	address: string | null;
	maxUsers: number | null;
	autoComplete: boolean;
	userEventId: string | null;
	completedAt: string | null;
	requires: string | null;
	totalOptions: number | null;
}

export interface MissedEvent {
	id: string;
	name: string;
	description: string;
	startsAt: string;
	registeredAt: string;
	userEventId: string;
}

// ============================================================================

/** Get user by ID */
export const get = query(v.pipe(v.string(), v.nonEmpty()), async (id) => {
	const [user] = await sql<User[]>`SELECT * FROM "user" WHERE id = ${id}`;
	return user ? user : error(404, 'User not found');
});

export const events = query(v.pipe(v.string(), v.nonEmpty()), async (id) => {
	return await sql<EventWithUserInfo[]>`
		WITH user_completed_event_types AS (
			SELECT DISTINCT e.eventTypeId
			FROM user_event ue
			JOIN event e ON ue.eventId = e.id
			WHERE ue.userId = ${id} AND ue.completedAt IS NOT NULL
		),
		user_registered_event_types AS (
			SELECT DISTINCT e.eventTypeId
			FROM user_event ue
			JOIN event e ON ue.eventId = e.id
			WHERE ue.userId = ${id}
			-- NULL startsAt = timeless event, always counts as "future"
			AND (e.startsAt IS NULL OR e.startsAt >= datetime('now'))
			AND ue.completedAt IS NULL
		),
		unmet_requires AS (
			SELECT
				dep.eventId,
				GROUP_CONCAT(rt.name) AS requires
			FROM event_type_dependency dep
			JOIN event_type rt ON dep.requiredTypeId = rt.id
			WHERE dep.requiredTypeId NOT IN (SELECT eventTypeId FROM user_completed_event_types)
			GROUP BY dep.eventId
		),
		type_option_counts AS (
			SELECT
				eventTypeId,
				COUNT(*) AS totalOptions
			FROM event
			-- NULL startsAt = always available, include it
			WHERE (startsAt IS NULL OR startsAt >= datetime('now', '-7 days'))
			GROUP BY eventTypeId
		)
		SELECT
			e.id,
			et.name,
			et.description,
			e.startsAt,
			e.registerUntil,
			e.address,
			e.maxUsers,
			e.autoComplete,
			ue.id        AS userEventId,
			ue.completedAt,
			ur.requires,
			toc.totalOptions
		FROM event e
		JOIN event_type et ON e.eventTypeId = et.id
		LEFT JOIN user_event ue ON ue.eventId = e.id AND ue.userId = ${id}
		LEFT JOIN unmet_requires ur ON ur.eventId = e.id
		LEFT JOIN type_option_counts toc ON toc.eventTypeId = e.eventTypeId
		WHERE
			(e.startsAt IS NULL OR e.startsAt >= datetime('now', '-7 days'))
			AND (
				e.eventTypeId NOT IN (SELECT eventTypeId FROM user_completed_event_types)
				OR ue.userId = ${id}
			)
			AND (
				ue.userId = ${id}
				OR e.eventTypeId NOT IN (SELECT eventTypeId FROM user_registered_event_types)
			)
		ORDER BY
			-- We order by the type and secondarily by the event start time
			et."order" ASC,
			CASE WHEN e.startsAt IS NULL THEN 1 ELSE 0 END,
			e.startsAt ASC
	`;
});

export const missed = query(v.pipe(v.string(), v.nonEmpty()), async (id) => {
	return await sql<MissedEvent[]>`
		SELECT
			e.id,
			et.name,
			et.description,
			e.startsAt,
			ue.createdAt AS registeredAt,
			ue.id        AS userEventId
		FROM user_event ue
		JOIN event e ON ue.eventId = e.id
		JOIN event_type et ON e.eventTypeId = et.id
		WHERE
			ue.userId = ${id}
			AND ue.completedAt IS NULL
			-- Only dated events can be "missed" — timeless ones never expire
			AND e.startsAt IS NOT NULL
			AND e.startsAt < datetime('now')
		ORDER BY e.startsAt DESC
	`;
});

export const register = command(v.pipe(v.string(), v.nonEmpty()), async (eventId) => {
	const event = getRequestEvent();
	const userId = event.locals.session?.userId;
	if (!userId) error(401, 'Unauthorized');

	interface EventRegistrationInfo {
		id: string;
		eventTypeId: string;
		startsAt: string | null;
		registerUntil: string | null;
		maxUsers: number | null;
		currentCount: number;
		alreadyRegisteredForType: number;
		unmetRequires: string | null;
	}

	const [row] = await sql<EventRegistrationInfo[]>`
		SELECT
			e.id,
			e.eventTypeId,
			e.startsAt,
			e.registerUntil,
			e.maxUsers,
			COUNT(ue_all.id) AS currentCount,
			COUNT(ue_user_type.id) AS alreadyRegisteredForType,
			GROUP_CONCAT(DISTINCT unmet_req_type.name) AS unmetRequires
		FROM event e
		LEFT JOIN user_event ue_all
			ON ue_all.eventId = e.id
		LEFT JOIN user_event ue_user_type
			ON ue_user_type.userId = ${userId}
			AND ue_user_type.completedAt IS NULL
			AND ue_user_type.eventId IN (
				SELECT id FROM event
				WHERE eventTypeId = e.eventTypeId
				-- NULL startsAt = timeless, always counts as active
				AND (startsAt IS NULL OR startsAt >= datetime('now'))
			)
		LEFT JOIN event_type_dependency dep
			ON dep.eventId = e.id
		LEFT JOIN event_type unmet_req_type
			ON unmet_req_type.id = dep.requiredTypeId
			AND dep.requiredTypeId NOT IN (
				SELECT DISTINCT ev.eventTypeId
				FROM user_event ue_c
				JOIN event ev ON ue_c.eventId = ev.id
				WHERE ue_c.userId = ${userId} AND ue_c.completedAt IS NOT NULL
			)
		WHERE e.id = ${eventId}
		GROUP BY e.id
	`;

	if (!row) error(404, 'Event not found');

	const now = Date.now('UTC');

	// NULL startsAt = timeless, never considered "already started"
	const hasStarted = row.startsAt
		? Date.parseAbsolute(row.startsAt, 'UTC').compare(now) < 0
		: false;

	// NULL registerUntil = no deadline
	const pastDeadline = row.registerUntil
		? Date.parseAbsolute(row.registerUntil, 'UTC').compare(now) < 0
		: false;

	const validations: [boolean, string][] = [
		[row.alreadyRegisteredForType > 0, 'You are already registered for an event of this type.'],
		[hasStarted, 'This event has already started.'],
		[pastDeadline, 'The registration deadline for this event has passed.'],
		[!!row.unmetRequires, `You must complete the following first: ${row.unmetRequires}.`],
		[row.maxUsers !== null && row.currentCount >= row.maxUsers, 'This event is full.'],
	];

	for (const [condition, message] of validations) {
		if (condition) error(422, message);
	}

	await sql`
		INSERT INTO user_event (id, userId, eventId)
		VALUES (${crypto.randomUUID()}, ${userId}, ${eventId})
	`;

	events(userId).refresh();
});

export const unregister = command(v.pipe(v.string(), v.nonEmpty()), async (eventId) => {
	const event = getRequestEvent();
	const userId = event.locals.session?.userId;
	if (!userId) error(401, 'Unauthorized');

	const [row] = await sql<{ startsAt: string | null; completedAt: string | null }[]>`
		SELECT e.startsAt, ue.completedAt
		FROM user_event ue
		JOIN event e ON ue.eventId = e.id
		WHERE ue.userId = ${userId} AND ue.eventId = ${eventId}
	`;

	if (!row) error(404, 'Registration not found');
	if (row.completedAt) invalid('You cannot unregister from a completed event.');

	// NULL startsAt = timeless, can always unregister
	const hasStarted = row.startsAt
		? Date.parseAbsolute(row.startsAt, 'UTC').compare(Date.now('UTC')) < 0
		: false;

	if (hasStarted) invalid('You cannot unregister from an event that has already started.');

	await sql`DELETE FROM user_event WHERE userId = ${userId} AND eventId = ${eventId}`;
	events(userId).refresh();
});
