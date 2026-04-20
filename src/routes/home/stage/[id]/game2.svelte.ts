// ============================================================================
// W2Inc, 2025, All Rights Reserved.
// ============================================================================

import Alea from "$lib/random";

export type Position = { x: number; y: number };
export type Color = 'R' | 'G' | 'B';
export type Direction = 0 | 1 | 2 | 3; // N E S W
export type Cell = "*" | "S" | "E" | "." | Color;
export type InstructionType = "LEFT" | "RIGHT" | "FORWARD" | "INVOKE";
export type CellString = string & { readonly __brand: 'CellString' };

export type FunctionSlotInstruction =
	| { type: Omit<InstructionType, "INVOKE">; color?: Color }
	| { type: Extract<InstructionType, "INVOKE">; index: number; color?: Color };

export interface Level {
	map: CellString;
	width: number;
	height: number;
	functions: FunctionSlotInstruction[][];
}

interface GenerationState {
	position: Position;
	direction: { current: Direction; previous: Direction };
	box: { minX: number; maxX: number; minY: number; maxY: number };
	path: Map<string, Cell>;
	steps: number;
	turns: number;
}

export function level(map: string): CellString {
	return map as CellString;
}

// ============================================================================

export class Generator {
	private static readonly MAX_INSTRUCTION_LENGTH = 7;
	private static readonly COLORS: Color[] = ['R', 'G', 'B'];
	private static readonly VECTORS = [
		{ dx: 0, dy: -1 }, // N
		{ dx: 1, dy: 0 }, // E
		{ dx: 0, dy: 1 }, // S
		{ dx: -1, dy: 0 }, // W
	];

	private alea: Alea;
	private difficulty: number = 0;

	constructor(public seed: string) {
		this.alea = new Alea({ seed });
	}

	// ── Helpers ──────────────────────────────────────────────────────────────

	/** Pick a uniformly random element from an array. */
	private pick<T>(arr: T[]): T {
		return arr[Math.floor(this.alea.random() * arr.length)]!;
	}

	private isMovement(t: InstructionType): t is "LEFT" | "RIGHT" | "FORWARD" {
		return t === "FORWARD" || t === "LEFT" || t === "RIGHT";
	}

	private isTurn(t: InstructionType | null): t is "LEFT" | "RIGHT" {
		return t === "LEFT" || t === "RIGHT";
	}

	// ── Public entry point ────────────────────────────────────────────────────

	public generate(difficulty: number): Level {
		this.difficulty = difficulty;

		const MAX_RETRIES = 50;
		const REQUIRED_TURNS = 1 + difficulty * 2;
		const REQUIRED_DISTANCE = 2 + difficulty * 6;
		const numFunctions = this.functionCount();

		let best: Level | null = null;
		let bestScore = -1;

		for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
			const MAX_STEPS = 50 + difficulty * 20;
			const functions = this.generateFunctions(numFunctions);

			const state: GenerationState = {
				position: { x: 0, y: 0 },
				direction: { current: 0, previous: 0 },
				box: { minX: 0, maxX: 0, minY: 0, maxY: 0 },
				path: new Map([["0,0", "S"]]),
				steps: 0,
				turns: 0,
			};

			this.sequence(0, functions, state, MAX_STEPS);
			state.path.set(`${state.position.x},${state.position.y}`, "E");

			const distance = Math.abs(state.position.x) + Math.abs(state.position.y);
			const score = distance + state.turns * 2;

			const width = state.box.maxX - state.box.minX + 3;
			const height = state.box.maxY - state.box.minY + 3;
			const offsetX = Math.abs(state.box.minX) + 1;
			const offsetY = Math.abs(state.box.minY) + 1;

			const buffer = new Uint8Array(width * height).fill('*'.charCodeAt(0));
			state.path.forEach((cell, key) => {
				const [cx, cy] = key.split(',').map(Number);
				buffer[(cy! + offsetY) * width + (cx! + offsetX)] = cell.charCodeAt(0);
			});

			const version: Level = {
				width, height, functions,
				map: level(new TextDecoder().decode(buffer)),
			};

			if (score > bestScore) {
				bestScore = score;
				best = version;
			}

			if (distance >= REQUIRED_DISTANCE && state.turns >= REQUIRED_TURNS) {
				return version;
			}
		}

		return best!;
	}

	// ── Simulation ────────────────────────────────────────────────────────────

	private sequence(
		index: number,
		functions: FunctionSlotInstruction[][],
		state: GenerationState,
		maxSteps: number,
	) {
		if (state.steps > maxSteps) return;

		for (const inst of functions[index] ?? []) {
			if (state.steps > maxSteps) break;
			state.steps++;

			if (inst.color) {
				// Color application fades out toward the end of the path.
				const breakChance = Math.pow(state.steps / maxSteps, 2);
				if (this.alea.random() >= breakChance) {
					const key = `${state.position.x},${state.position.y}`;
					if (state.path.get(key) !== 'S') state.path.set(key, inst.color);
				}
			}

			switch (inst.type) {
				case "LEFT":
					state.direction.current = ((state.direction.current + 3) % 4) as Direction;
					break;

				case "RIGHT":
					state.direction.current = ((state.direction.current + 1) % 4) as Direction;
					break;

				case "FORWARD": {
					const vec = Generator.VECTORS[state.direction.current]!;
					state.position.x += vec.dx;
					state.position.y += vec.dy;

					state.box.minX = Math.min(state.box.minX, state.position.x);
					state.box.maxX = Math.max(state.box.maxX, state.position.x);
					state.box.minY = Math.min(state.box.minY, state.position.y);
					state.box.maxY = Math.max(state.box.maxY, state.position.y);

					const key = `${state.position.x},${state.position.y}`;
					if (!state.path.has(key)) state.path.set(key, '.');

					if (state.direction.current !== state.direction.previous) {
						state.direction.previous = state.direction.current;
						state.turns++;
					}
					break;
				}

				case "INVOKE":
					const instance = inst as Extract<FunctionSlotInstruction, { type: "INVOKE" }>;
					this.sequence(instance.index, functions, state, maxSteps);
					break;
			}
		}
	}

	// ── Function generation ───────────────────────────────────────────────────

	private generateFunctions(count: number): FunctionSlotInstruction[][] {
		const fns: FunctionSlotInstruction[][] = Array.from({ length: count }, () => []);

		for (let i = 0; i < count; i++) {
			const fn = fns[i]!;
			const minLen = 4 + Math.floor(this.difficulty * 1.5);
			const maxLen = Math.min(Generator.MAX_INSTRUCTION_LENGTH, Math.ceil(4 + this.difficulty * 3));
			const length = minLen + Math.floor(this.alea.random() * (maxLen - minLen + 1));

			for (let j = 0; j < length; j++) {
				fn.push(this.generateInstruction(fn, count, i));
			}

			// Guarantee at least one turn — momentum bias can occasionally produce
			// an all-FORWARD function. Swap a mid-body FORWARD to avoid disrupting
			// entry/exit flow.
			if (!fn.some(inst => this.isTurn(inst.type as InstructionType))) {
				const candidates = fn
					.map((inst, idx) => ({ inst, idx }))
					.filter(({ inst, idx }) =>
						inst.type === "FORWARD" && idx > 0 && idx < fn.length - 1
					);

				if (candidates.length > 0) {
					const { idx } = this.pick(candidates);
					fn[idx] = { type: this.pick(["LEFT", "RIGHT"] as const) };
				}
			}
		}

		// Cross-function anti-spin pass:
		// If F1 ends with a turn and directly invokes F2 which starts with a turn,
		// the boundary spin is never caught by per-function rules. Fix by forcing
		// any such callee's first instruction to FORWARD.
		for (let fi = 0; fi < fns.length; fi++) {
			const target = fns[fi]!;
			if (!target.length || !this.isTurn(target[0]!.type as InstructionType)) continue;

			let needsFix = false;
			outer: for (const caller of fns) {
				for (let ii = 0; ii < caller.length; ii++) {
					const inst = caller[ii]!;
					if (inst.type !== "INVOKE" || (inst as any).index !== fi) continue;

					// Find the last movement primitive before this call site.
					let lastMove: InstructionType | null = null;
					for (let k = ii - 1; k >= 0; k--) {
						const t = caller[k]!.type as InstructionType;
						if (this.isMovement(t)) { lastMove = t; break; }
					}

					if (this.isTurn(lastMove)) { needsFix = true; break outer; }
				}
			}

			if (needsFix) target[0] = { type: "FORWARD" };
		}

		return fns;
	}

	private generateInstruction(
		fn: FunctionSlotInstruction[],
		total: number,
		fnIndex: number,
	): FunctionSlotInstruction {
		let options: InstructionType[] = ["FORWARD", "LEFT", "RIGHT"];
		if (total > 1) options.push("INVOKE");

		// ── INVOKE-chaining rules ─────────────────────────────────────────────
		const tail = fn.at(-1) ?? null;
		const prevIsInvoke = tail?.type === "INVOKE";
		const prevInvokeColor = prevIsInvoke && !!(tail as any).color;

		// Count consecutive trailing INVOKEs.
		let trailingInvokes = 0;
		for (let k = fn.length - 1; k >= 0 && fn[k]!.type === "INVOKE"; k--)
			trailingInvokes++;

		// A bare INVOKE always ends the chain; a colored INVOKE chain is capped at 2.
		if (prevIsInvoke && (!prevInvokeColor || trailingInvokes >= 2)) {
			options = options.filter(o => o !== "INVOKE");
		}

		// A bare INVOKE to a target is unconditional — a second call is dead code.
		const targetIndex = (fnIndex + 1) % total;
		const priorInvoke = fn.find(inst =>
			inst.type === "INVOKE" && (inst as any).index === targetIndex
		);
		if (priorInvoke && !(priorInvoke as any).color) {
			options = options.filter(o => o !== "INVOKE");
		}

		// ── Movement history (walk back, skipping INVOKEs) ────────────────────
		const moves: InstructionType[] = [];
		for (let k = fn.length - 1; k >= 0 && moves.length < 3; k--) {
			const t = fn[k]!.type as InstructionType;
			if (this.isMovement(t)) moves.push(t);
		}
		const [prev1, prev2, prev3] = moves;

		// Ban turn-after-turn (anti-spin).
		if (this.isTurn(prev1 ?? null)) {
			options = options.filter(o => !this.isTurn(o as InstructionType));
		}
		// Ban a 4th consecutive FORWARD.
		if (prev1 === "FORWARD" && prev2 === "FORWARD" && prev3 === "FORWARD") {
			options = options.filter(o => o !== "FORWARD");
		}
		// Bias toward FORWARD after two non-forward moves (weighted pool).
		if (prev1 !== "FORWARD" && prev2 !== "FORWARD" && options.includes("FORWARD")) {
			options = ["FORWARD", "FORWARD", "FORWARD", ...options];
		}

		// ── Pick type and optionally color ────────────────────────────────────
		const type = this.pick(options);

		if (type === "INVOKE") {
			const isLoop = targetIndex <= fnIndex;
			const mustColor = isLoop || prevInvokeColor;
			const useColor = mustColor || (this.difficulty > 1 && this.alea.random() > 0.5);
			return {
				type: "INVOKE",
				index: targetIndex,
				color: useColor ? this.pick(Generator.COLORS) : undefined,
			} as FunctionSlotInstruction;
		}

		const color = this.difficulty > 1 && this.alea.random() > 0.8
			? this.pick(Generator.COLORS)
			: undefined;
		return { type, color } as FunctionSlotInstruction;
	}

	// ── Misc ──────────────────────────────────────────────────────────────────

	private functionCount(): number {
		const value = this.difficulty * 5;
		const floor = Math.floor(value);
		const count = this.alea.random() < (value - floor) ? floor + 1 : floor;
		return Math.min(5, Math.max(1, count));
	}
}
