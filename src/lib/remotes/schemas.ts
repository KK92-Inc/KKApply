// ============================================================================
// W2Inc, 2025, All Rights Reserved.
// See README in the root project for more information.
// ============================================================================

import * as v from "valibot";

// ============================================================================

export const id = v.pipe(
	v.string(),
	v.nonEmpty('ID is required.'),
);

export const email = v.pipe(
	v.string(),
	v.nonEmpty('Please enter your email.'),
	v.email('The email is badly formatted.'),
	v.maxLength(128, 'Your email is too long.')
);

export const captcha = v.object({
	email,
	token: v.pipe(
		v.string(),
		v.nonEmpty('Captcha token is required.')
	)
});
