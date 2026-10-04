import { parseAbsolute, now } from "@internationalized/date";

/**
 * Format the time left until the timer ends, given the start time and duration in minutes.
 * @param startsAt The start time in ISO string format.
 * @param minutes The duration of the timer in minutes. Defaults to 30 minutes.
 * @returns The formatted time left in "HH:MM:SS" format, or the empty string if startsAt is not provided.
 */
export function format(startsAt: string | null, minutes: number = 30) {
	const empty = "00:00:00";
	if (!startsAt) return empty;
	const endsAt = parseAbsolute(startsAt, "UTC").add({
		minutes,
	});

	const current = now("UTC");
	if (current.compare(endsAt) >= 0) {
		return empty;
	}

	// Calculate diff using underlying epoch milliseconds
	const diffMs = endsAt.toDate().getTime() - current.toDate().getTime();
	const totalSeconds = Math.floor(diffMs / 1000);

	const h = Math.floor(totalSeconds / 3600);
	const m = Math.floor((totalSeconds % 3600) / 60);
	const s = totalSeconds % 60;

	const pad = (n: number) => n.toString().padStart(2, "0");
	return `${pad(h)}:${pad(m)}:${pad(s)}`;
}
