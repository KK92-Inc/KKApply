// ============================================================================
// W2Inc, 2025, All Rights Reserved.
// See README in the root project for more information.
// ============================================================================

import { command, form, getRequestEvent, query } from "$app/server";
import { env } from "$env/dynamic/private";
import { error, redirect } from "@sveltejs/kit";
import { captcha } from "./schemas";
import { sql } from "bun";
import type { User, VerificationToken } from "$models";
import { resend } from "$lib/email";
import { PUBLIC_APP_URL } from "$env/static/public";
import { generateToken } from "$lib/utils";
import { dev } from "$app/environment";

// ============================================================================

/**
 * Verify captcha token with Cloudflare Turnstile
 * @param token The captcha token to verify.
 * @param fetchFn The fetch function to use for making the request.
 */
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
export const login = form(captcha, async (data) => {
	const { fetch } = getRequestEvent();
	await turnstile(data.token, fetch);

	// Prevent timing attacks with artificial jitter
	await new Promise(resolve => setTimeout(resolve, Math.random() * 750));

	const id = generateToken();
	const user = await ensureUser(data.email);
	await sql`
		INSERT OR REPLACE INTO "verification_token" (id, "userId", "expiresAt")
		VALUES (${id}, ${user.id}, (strftime('%Y-%m-%dT%H:%M:%SZ', 'now', '+15 minutes')))
	`;

	if (dev) {
		redirect(303, `/token/${id}`);
	} else { // TODOL: Fancy email template with MJML or similar
		await resend.emails.send({
			from: 'Acme <onboarding@resend.dev>',
			to: [user.email],
			subject: 'Hello World',
			html: `<a href="${PUBLIC_APP_URL}/token/${id}">Click here to sign in</a>`,
		});
	}
});

export const logout = form(async () => {
	const { cookies } = getRequestEvent();
	const id = cookies.get('session');
	if (id) {
		await sql`DELETE FROM session WHERE id = ${id}`;
		cookies.delete('session', { path: '/' });
	}

	redirect(303, '/');
});
