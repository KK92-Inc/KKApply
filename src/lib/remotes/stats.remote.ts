import { query, command } from '$app/server';
import { getRequestEvent } from '$app/server';
import * as v from 'valibot';
import type { User } from '$models';
import { sql } from 'bun';
import { error, invalid } from '@sveltejs/kit';
import { UserFlag } from '$lib';
import * as Users from './user.remote';
import * as Date from '@internationalized/date';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface UserStats {
	total: number;
	verified: number;
	banned: number;
	subscribed: number;
	newLast7Days: number;
	newLast30Days: number;
}

export interface DailySignup {
	date: string;
	count: number;
}

export interface FunnelStep {
	eventTypeName: string;
	order: number;
	registered: number;
	completed: number;
	missed: number;
}

export interface EventFill {
	eventName: string;
	eventTypeName: string;
	startsAt: string | null;
	maxUsers: number | null;
	registered: number;
	completed: number;
	fillPct: number | null;
}

// ── Queries ───────────────────────────────────────────────────────────────────

/** High-level user counts */
export const getUserStats = query(async () => {
	const [row] = await sql<UserStats[]>`
		SELECT
			COUNT(*)                                                      AS total,
			SUM(CASE WHEN verified = 1 THEN 1 ELSE 0 END)                AS verified,
			SUM(CASE WHEN banned   = 1 THEN 1 ELSE 0 END)                AS banned,
			SUM(CASE WHEN subscribed = 1 THEN 1 ELSE 0 END)              AS subscribed,
			SUM(CASE WHEN createdAt >= datetime('now', '-7 days')
				THEN 1 ELSE 0 END)                                        AS newLast7Days,
			SUM(CASE WHEN createdAt >= datetime('now', '-30 days')
				THEN 1 ELSE 0 END)                                        AS newLast30Days
		FROM "user"
	`;

	return row ?? error(500, 'Failed to retrieve user stats');
});

/**
 * Daily new signups for the last N days.
 * Gaps (days with 0 signups) are filled in so the chart line is continuous.
 */
export const getDailySignups = query(async () => {
	const rows = await sql<{ date: string; count: number }[]>`
		SELECT
			strftime('%Y-%m-%d', createdAt)  AS date,
			COUNT(*)                         AS count
		FROM "user"
		WHERE createdAt >= datetime('now', '-31 days')
		GROUP BY date
		ORDER BY date ASC
	`;

	const map = new Map(rows.map((r) => [r.date, r.count]));
	const result: DailySignup[] = [];
	const today = Date.today('UTC');

	for (let i = 31; i >= 0; i--) {
		const d = today.subtract({ days: i });
		const key = d.toString(); // Formats as 'YYYY-MM-DD'

		result.push({
			date: `${key}T00:00:00Z`,
			count: map.get(key) ?? 0
		});
	}

	return result;
});

/**
 * Funnel: for each event type (in order), how many users registered,
 * completed, or missed.
 */
export const getFunnel = query(async () => {
	return await sql<FunnelStep[]>`
		SELECT
			et.name                                                        AS eventTypeName,
			et."order"                                                     AS "order",
			COUNT(DISTINCT ue.userId)                                      AS registered,
			COUNT(DISTINCT CASE WHEN ue.completedAt IS NOT NULL
				THEN ue.userId END)                                        AS completed,
			COUNT(DISTINCT CASE
				WHEN ue.completedAt IS NULL
				AND  e.startsAt IS NOT NULL
				AND  e.startsAt < datetime('now')
				THEN ue.userId END)                                        AS missed
		FROM event_type et
		LEFT JOIN event e        ON e.eventTypeId = et.id
		LEFT JOIN user_event ue  ON ue.eventId   = e.id
		GROUP BY et.id
		ORDER BY et."order" ASC
	`;
});

/**
 * Per-event fill rate — useful for capacity planning.
 * Only shows events that have or had registrations, or a maxUsers cap.
 */
export const getEventFillRates = query(async () => {
	return await sql<EventFill[]>`
		SELECT
			et.name                                                AS eventTypeName,
			e.id,
			e.startsAt,
			e.maxUsers,
			COUNT(ue.id)                                           AS registered,
			SUM(CASE WHEN ue.completedAt IS NOT NULL THEN 1 ELSE 0 END) AS completed,
			CASE
				WHEN e.maxUsers IS NOT NULL AND e.maxUsers > 0
				THEN ROUND(COUNT(ue.id) * 100.0 / e.maxUsers, 1)
				ELSE NULL
			END AS fillPct
		FROM event e
		JOIN event_type et  ON et.id = e.eventTypeId
		LEFT JOIN user_event ue ON ue.eventId = e.id
		GROUP BY e.id
		HAVING registered > 0 OR e.maxUsers IS NOT NULL
		ORDER BY et."order" ASC, e.startsAt ASC
	`;
});
