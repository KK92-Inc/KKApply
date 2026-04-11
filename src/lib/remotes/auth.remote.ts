// ============================================================================
// W2Inc, 2025, All Rights Reserved.
// See README in the root project for more information.
// ============================================================================

import { form, getRequestEvent, query } from "$app/server";
import { env } from "$env/dynamic/private";
import { error, redirect } from "@sveltejs/kit";
import { Schemas } from "./schemas";
import { sql } from "bun";
import type { User, VerificationToken } from "$models";

// ============================================================================

function generateToken() {
	const values = crypto.getRandomValues(new Uint8Array(32));
	return Buffer.from(values).toString('base64url');
}

async function turnstile(token: string, fetchFn: typeof fetch) {
	const url = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';
	const body = JSON.stringify({ response: token, secret: env.CAPTCHA_SECRET_KEY });
	const response = await fetchFn(url, {
		method: 'POST',
		headers: { 'content-type': 'application/json' },
		body,
	});

	const { success } = await response.json();
	if (!success) error(422, 'Captcha verification failed. Please try again.');
}

/**
 * Ensure a user exists for the given email. Row is returned otherwise
 * @param email The email of the user.
 * @returns The user associated with the email.
 */
async function ensureUser(email: string) {
	const userId = Bun.randomUUIDv7();
	const emailToken = generateToken();
	const [user] = await sql<User[]>`
		INSERT INTO "user" (id, email, emailToken)
		VALUES (${userId}, ${email}, ${emailToken})
		ON CONFLICT (email) DO UPDATE
			SET id = "user".id
		RETURNING *
	`;

	if (!user) {
		error(500, 'An unexpected error occurred. Please try again later.');
	}

	return user;
}


// ============================================================================

/** Send verification email */
export const login = form(Schemas.captcha, async (data) => {
	const { fetch } = getRequestEvent();
	await Promise.allSettled([
		turnstile(data.token, fetch),
		// Prevent timing attacks with artificial jitter
		new Promise(resolve => setTimeout(resolve, Math.random() * 750))
	]);

	const id = generateToken();
	const user = await ensureUser(data.email);
	await sql`
		INSERT OR REPLACE INTO "verification_token" (id, "userId", "expiresAt")
		VALUES (${id}, ${user.id}, (strftime('%Y-%m-%dT%H:%M:%SZ', 'now', '+15 minutes')))
	`;
});


// ============================================================================

