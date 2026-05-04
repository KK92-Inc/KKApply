// ============================================================================
// W2Inc, 2025, All Rights Reserved.
// See README in the root project for more information.
// ============================================================================

import type { Level } from "./games/rocket.svelte";

export const UserFlag = {
	IsAdmin: 1 << 2,
} as const;

// export const ApplicationStepType = {
// 	Boarding: 0,
// 	Intermission: 1,
// 	Challenge: 2,
// 	Waiting: 3,
// 	Result: 4
// } as const

// ============================================================================
