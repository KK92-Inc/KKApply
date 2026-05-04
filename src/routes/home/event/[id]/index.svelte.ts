// ============================================================================
// W2Inc, 2025, All Rights Reserved.
// See README in the root project for more information.
// ============================================================================

import { createContext } from "svelte";
import type { ApplicationEvent, UserEvent } from "$models";

// ============================================================================

export const [get, set] = createContext<{
	event: PromiseLike<ApplicationEvent>;
	userEvent: PromiseLike<UserEvent>;
}>();
