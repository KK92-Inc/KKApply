// ============================================================================
// W2Inc, 2025, All Rights Reserved.
// See README in the root project for more information.
// ============================================================================

type Position = { x: number; y: number };
type Color = 'R' | 'G' | 'B';
type Cell = "*" | "S" | "E" | "." | Color;
type InstructionType = "LEFT" | "RIGHT" | "FORWARD" | "INVOKE";
type CellString = string & { readonly __brand: 'CellString' };

export type FunctionSlotInstruction =
	| { type: Omit<InstructionType, "INVOKE">; color?: Color }
	| { type: Extract<InstructionType, "INVOKE">; index: number; color?: Color; };

export interface FunctionSlot {
	length: number;
}

export interface Level {
	map: CellString; // use length y * width + x
	// map: Cell[]; // use length y * width + x
	width: number;
	height: number;
	functions: FunctionSlot[];
}

// ============================================================================

export function level(map: string): CellString {
	return map as CellString;
}

export class GameSession {
	public stage = $state(0);
}

// ============================================================================

export const sample: Level = {
	map: level(`
*****
*S.E*
*****
	`),
	width: 5,
	height: 3,
	functions: [
		{ length: 5 },
		{ length: 3 }
	]
};
