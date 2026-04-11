// ============================================================================
// W2Inc, 2025, All Rights Reserved.
// See README in the root project for more information.
// ============================================================================

import { sql } from "bun";
import type { Session, VerificationToken } from "$models";
import type { RequestHandler } from "@sveltejs/kit";
import * as Date from "@internationalized/date";
import { generateToken } from "$lib/utils";
import { dev } from "$app/environment";

// ============================================================================

export const GET: RequestHandler = async ({ cookies, params, getClientAddress }) => {
	const [token] = await sql<VerificationToken[]>`
		SELECT * FROM verification_token
		WHERE id = ${params.token}
	`;

	if (!token || Date.parseAbsolute(token.expiresAt, 'UTC').compare(Date.now('UTC')) < 0) {
		await sql`DELETE FROM verification_token WHERE id = ${params.token}`;
		return new Response('Token is invalid or has expired.', { status: 400 });
	}

	const id = generateToken();
	const ip = getClientAddress();
	const [session] = await sql.begin(async (tx) => {
		await tx`UPDATE "user" SET verified = true WHERE id = ${token.userId}`;
		await tx`DELETE FROM verification_token WHERE id = ${token.id}`;
		return tx<Session[]>`
			INSERT INTO session (id, ip, "userId")
			VALUES (${id}, ${ip}, ${token.userId})
			ON CONFLICT ("userId", ip) DO UPDATE
				SET "expiresAt" = (strftime('%Y-%m-%dT%H:%M:%SZ', 'now', '+7 days'))
			RETURNING *
		`;
	});

	cookies.set('session', session!.id, {
		path: '/',
		httpOnly: true,
		sameSite: 'lax',
		secure: !dev,
	});

	return Response.redirect('/home', 303);
};
