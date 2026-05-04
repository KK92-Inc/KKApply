// ============================================================================
// W2Inc, 2025, All Rights Reserved.
// See README in the root project for more information.
// ============================================================================

import Alea from "$lib/random";

// ============================================================================

export interface MemoryGame {
	size: number;
	difficulty: number;
	sequence: number[];
}

// ============================================================================

/**
 * A simple generator for a memory game.
 *
 * Difficulty (0–1) controls both the grid size and sequence length:
 *   - difficulty 0   →  3×3  grid, ~3 cell sequence
 *   - difficulty 0.5 →  6×6  grid, ~13 cell sequence
 *   - difficulty 1   →  9×9  grid, ~28 cell sequence
 */
export class Generator {
	private alea: Alea;

	constructor(seed: string) {
		this.alea = new Alea({ seed });
	}

	public generate(difficulty: number): MemoryGame {
		const diff = Math.max(0, Math.min(1, difficulty));

		// Grid side: 3 → 9 (smooth, then rounded)
		const size = Math.round(3 + diff * 6);
		const total = size * size;

		// Sequence length: 3 → ~35 % of all cells
		const min = 3;
		const max = Math.max(min + 1, Math.floor(total * 0.35));
		const length = Math.round(min + diff * (max - min));

		// Pick unique random cell indices via partial Fisher-Yates
		const pool = Array.from({ length: total }, (_, i) => i);
		const sequence: number[] = [];
		for (let i = 0; i < length; i++) {
			const pick = Math.floor(this.alea.random() * (pool.length - i));
			sequence.push(pool[pick]!);
			pool[pick] = pool[pool.length - 1 - i]!;
		}

		return { size, difficulty, sequence };
	}
}
