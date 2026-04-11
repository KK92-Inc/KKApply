// ============================================================================
// W2Inc, 2025, All Rights Reserved.
// See README in the root project for more information.
// ============================================================================

import { Resend } from "resend";
import { env } from "$env/dynamic/private";

// ============================================================================

export const resend = new Resend(env.RESEND_API_KEY);
