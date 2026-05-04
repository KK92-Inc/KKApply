// ============================================================================
// W2Inc, 2025, All Rights Reserved.
// See README in the root project for more information.
// ============================================================================

import { sql } from "bun";
import * as v from "valibot";
import { id } from "./schemas";
import { error } from "@sveltejs/kit";
import * as Date from '@internationalized/date';
import { command, getRequestEvent, query } from "$app/server";
import type { UserEvent, ApplicationEvent } from "$models";

export interface EventWithUserInfo {
	id: string;
	eventTypeId: string;
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

interface EventEntitlement {
	id: string;
	eventTypeId: string;
	startsAt: string | null;
	registerUntil: string | null;
	capacity: number | null;
	enrolled: number;
	// Did we already register for a previous event of the same type?
	priorRegistration: number;
	unmetRequirements: string | null;
}

// ============================================================================

/** Gets an event by its ID. */
export const get = query(id, async (eventId) => {
	const [event] = await sql<ApplicationEvent[]>`
		SELECT e.*, et.name AS eventTypeName
		FROM event e
		JOIN event_type et ON e.eventTypeId = et.id
		WHERE e.id = ${eventId}
		LIMIT 1
	`;

	return event ?? error(404, "Event not found");
});

const queryUserEventSchema = v.union([
	v.object({ eventId: id, userId: id }),
	v.object({ userEventId: id, userId: id }),
]);

/** Gets a user event by its ID. */
export const getUserEvent = query(queryUserEventSchema, async (payload) => {
	if ("eventId" in payload) {
		const [userEvent] = await sql<UserEvent[]>`
			SELECT ue.*
			FROM user_event ue
			WHERE ue.eventId = ${payload.eventId}
			  AND ue.userId = ${payload.userId}
			LIMIT 1
		`;

		return userEvent ?? error(404, "User event not found");
	} else {
		const [userEvent] = await sql<UserEvent[]>`
			SELECT ue.*
			FROM user_event ue
			WHERE ue.id = ${payload.userEventId}
			  AND ue.userId = ${payload.userId}
			LIMIT 1
		`;

		return userEvent ?? error(404, "User event not found");
	}
});

// ============================================================================
// Event Management
// ============================================================================

const userEventSchema = v.object({ eventId: id, userId: id });
const userEventInstanceSchema = v.object({ userEventId: id, userId: id });

/** Checks if a user is registered for an event. */
export const isRegistered = query(userEventSchema, async (payload) => {
	const [userEvent] = await sql<UserEvent[]>`
		SELECT id FROM user_event
		WHERE eventId = ${payload.eventId}
		  AND userId = ${payload.userId}
		LIMIT 1
	`;

	return !!userEvent;
});

/** Checks if the instance belongs to the specified user */
export const entitled = query(userEventInstanceSchema, async (payload) => {
	const [userEvent] = await sql<UserEvent[]>`
		SELECT id FROM user_event
		WHERE id = ${payload.userEventId}
		  AND userId = ${payload.userId}
		LIMIT 1
	`;

	return !!userEvent;
});

/** Registers a user for an event. */
export const register = command(userEventSchema, async (payload) => {
	if (await isRegistered(payload)) {
		error(422, "Already registered for this event.");
	}

	// Now let's check if we are entitled to register...
	const [row] = await sql<EventEntitlement[]>`
		SELECT
			e.id,
			e.eventTypeId,
			e.startsAt,
			e.registerUntil,
			e.maxUsers AS capacity,
			COUNT(ue_all.id) AS enrolled,
			COUNT(ue_user_type.id) AS priorRegistration,
			GROUP_CONCAT(DISTINCT unmet_req_type.name) AS unmetRequirements
		FROM event e
		LEFT JOIN user_event ue_all
			ON ue_all.eventId = e.id
		LEFT JOIN user_event ue_user_type
			ON ue_user_type.userId = ${payload.userId}
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
				WHERE ue_c.userId = ${payload.userId} AND ue_c.completedAt IS NOT NULL
			)
		WHERE e.id = ${payload.eventId}
		GROUP BY e.id
	`;

	if (!row) {
		// Event seems to not exist anymore.
		error(404, "Event not found.");
	}

	const now = Date.now('UTC');
	const started = row.startsAt
		? Date.parseAbsolute(row.startsAt, 'UTC').compare(now) < 0
		: false;

	const deadlined = row.registerUntil
		? Date.parseAbsolute(row.registerUntil, 'UTC').compare(now) < 0
		: false;

	const validations: [boolean, string][] = [
		[row.priorRegistration > 0, 'You are already registered for an event of this type.'],
		[started, 'This event has already started.'],
		[deadlined, 'The registration deadline for this event has passed.'],
		[!!row.unmetRequirements, `You must complete the following first: ${row.unmetRequirements}.`],
		[row.capacity !== null && row.enrolled >= row.capacity, 'This event is full.'],
	];

	if (validations.some(v => v[0])) {
		error(422, validations.filter(v => v[0]).map(v => v[1]).join(' '));
	}

	await sql`
		INSERT INTO user_event (id, userId, eventId)
		VALUES (${Bun.randomUUIDv7()}, ${payload.userId}, ${payload.eventId})
	`;

	registered(payload.userId).refresh();
});

/** Unregisters a user from an event. */
export const unregister = command(userEventSchema, async (payload) => {
	type Row = { startsAt: string | null, completedAt: string | null };
	const [row] = await sql<Row[]>`
		SELECT e.startsAt, ue.completedAt FROM user_event ue
		JOIN event e ON ue.eventId = e.id
		WHERE ue.userId = ${payload.userId}
		AND ue.eventId = ${payload.eventId}
	`;

	if (!row) error(404, "You are not registered for this event.");
	if (row.completedAt) error(422, "You have already completed this event.");
	const started = row.startsAt
		? Date.parseAbsolute(row.startsAt, 'UTC').compare(Date.now('UTC')) < 0
		: false;

	if (started) error(422, "This event has already started.");

	await sql`
		DELETE FROM user_event
			WHERE userId = ${payload.userId}
			AND eventId = ${payload.eventId}
	`;

	registered(payload.userId).refresh();
});

/** Starts a user event. */
export const start = command(userEventSchema, async (payload) => {
	await sql`
		UPDATE user_event
		SET startedAt = datetime('now')
		WHERE id = (
			SELECT ue.id
			FROM user_event ue
			JOIN event e ON ue.eventId = e.id
			JOIN event_type et ON e.eventTypeId = et.id
			WHERE ue.userId = ${payload.userId}
				AND e.id = ${payload.eventId}
				AND ue.startedAt IS NULL
				AND (e.startsAt IS NULL OR e.startsAt < datetime('now'))
			LIMIT 1
		)
	`;

	get(payload.eventId).refresh();
	registered(payload.userId).refresh();
});

// ============================================================================
// Event State
// ============================================================================

/** Get the events a user is registered for. */
export const registered = query(id, async (userId) => {
	return await sql<EventWithUserInfo[]>`
		WITH user_completed_event_types AS (
			SELECT DISTINCT e.eventTypeId
			FROM user_event ue
			JOIN event e ON ue.eventId = e.id
			WHERE ue.userId = ${userId} AND ue.completedAt IS NOT NULL
		),
		user_registered_event_types AS (
			SELECT DISTINCT e.eventTypeId
			FROM user_event ue
			JOIN event e ON ue.eventId = e.id
			WHERE ue.userId = ${userId}
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
			e.eventTypeId,
			e.autoComplete,
			ue.id        AS userEventId,
			ue.completedAt,
			ur.requires,
			toc.totalOptions
		FROM event e
		JOIN event_type et ON e.eventTypeId = et.id
		LEFT JOIN user_event ue ON ue.eventId = e.id AND ue.userId = ${userId}
		LEFT JOIN unmet_requires ur ON ur.eventId = e.id
		LEFT JOIN type_option_counts toc ON toc.eventTypeId = e.eventTypeId
		WHERE
			(e.startsAt IS NULL OR e.startsAt >= datetime('now', '-7 days'))
			AND (
				e.eventTypeId NOT IN (SELECT eventTypeId FROM user_completed_event_types)
				OR ue.userId = ${userId}
			)
			AND (
				ue.userId = ${userId}
				OR e.eventTypeId NOT IN (SELECT eventTypeId FROM user_registered_event_types)
			)
		ORDER BY
			-- We order by the type and secondarily by the event start time
			et."order" ASC,
			CASE WHEN e.startsAt IS NULL THEN 1 ELSE 0 END,
			e.startsAt ASC
	`;
});

export const missed = query(v.pipe(v.string(), v.nonEmpty()), async (userId) => {
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
			ue.userId = ${userId}
			AND ue.completedAt IS NULL
			-- Only dated events can be "missed" — timeless ones never expire
			AND e.startsAt IS NOT NULL
			AND e.startsAt < datetime('now')
		ORDER BY e.startsAt DESC
	`;
});

// ============================================================================

