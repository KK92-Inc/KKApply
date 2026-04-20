// ============================================================================
// W2Inc, 2025, All Rights Reserved.
// ============================================================================

export type Position = { x: number; y: number };
export type Color = 'R' | 'G' | 'B';
export type Direction = 0 | 1 | 2 | 3; // 0: N, 1: E, 2: S, 3: W
export type Cell = "*" | "S" | "E" | "." | Color;
export type InstructionType = "LEFT" | "RIGHT" | "FORWARD" | "INVOKE";
export type CellString = string & { readonly __brand: 'CellString' };

export type FunctionSlotInstruction =
  | { type: Omit<InstructionType, "INVOKE">; color?: Color }
  | { type: Extract<InstructionType, "INVOKE">; index: number; color?: Color; };

export interface Level {
  map: CellString;
  width: number;
  height: number;
  functions: FunctionSlotInstruction[][];
}

export function level(map: string): CellString {
  return map as CellString;
}

// ============================================================================

export class Generator {
  public static readonly MAX_INSTRUCTION_LENGTH = 7;
  private static readonly COLORS: Color[] = ['R', 'G', 'B'];

  private static getRandom<T>(arr: T[]): T {
    return arr[Math.floor(this.random() * arr.length)];
  }

  private static random(min: number = 0, max: number = 1): number {
    const val = crypto.getRandomValues(new Uint32Array(1))[0]! / 0xffffffff;
    return min + val * (max - min);
  }

  // FIX 1: Helper — only movement primitives count for momentum/spin tracking.
  // INVOKE is a structural instruction and should be invisible to these heuristics.
  private static isMovementPrimitive(type: InstructionType | null): boolean {
    return type === "FORWARD" || type === "LEFT" || type === "RIGHT";
  }

  private static generateFunctions(numFunctions: number, difficulty: number): FunctionSlotInstruction[][] {
    const functions: FunctionSlotInstruction[][] = Array.from({ length: numFunctions }, () => []);

    for (let i = 0; i < numFunctions; i++) {
      // SNAP FIX: Instruction length now has a minimum that grows with difficulty.
      // At difficulty 0 we get [4, 5), at 0.5 we get [4, 6), at 1 we get [5, 7].
      // Previously the minimum was always 3, which combined with the anti-spin rule
      // left almost no room for variety — L→F→R→F was nearly the only outcome.
      const minLen = 4 + Math.floor(difficulty * 1.5);
      const maxLen = Math.min(this.MAX_INSTRUCTION_LENGTH, Math.ceil(4 + difficulty * 3));
      const length = Math.floor(this.random(minLen, maxLen + 1));
			const current = functions[i]!;

      for (let j = 0; j < length; j++) {
        current.push(this.generateSafeInstruction(current, numFunctions, i, difficulty));
      }

      // FIX 4: Post-generation pass — guarantee at least one turn per function.
      // Without this, momentum bias can produce an all-FORWARD function even after
      // the other fixes, since no single instruction step is forced to be a turn.
      const hasTurn = current.some(inst => inst.type === "LEFT" || inst.type === "RIGHT");
      if (!hasTurn) {
        // Find a FORWARD instruction that isn't at the very start or end to swap out,
        // so we don't break the entry/exit flow of the function.
        const candidates = current
          .map((inst, idx) => ({ inst, idx }))
          .filter(({ inst, idx }) => inst.type === "FORWARD" && idx > 0 && idx < current.length - 1);

        if (candidates.length > 0) {
          const { idx } = this.getRandom(candidates);
          current[idx] = { type: this.getRandom(["LEFT", "RIGHT"] as InstructionType[]) } as FunctionSlotInstruction;
        }
      }
    }

    // Cross-function anti-spin pass ─────────────────────────────────────────
    // The intra-function anti-spin rule only sees a single function's history.
    // When F1 ends with RIGHT and invokes F2 whose first instruction is LEFT,
    // the boundary is never checked and the rule is silently violated.
    //
    // Fix: after all functions are built, walk every INVOKE call site, find the
    // last movement primitive in the caller before the INVOKE, and if the first
    // instruction of the called function creates a spin (turn→turn), replace it
    // with FORWARD — which is always a safe, neutral entry point.
    //
    // A function can be called from multiple places with different preceding
    // moves, so we iterate all call sites and fix on any single conflict found.
    for (let targetFi = 0; targetFi < functions.length; targetFi++) {
      const target = functions[targetFi]!;
      if (target.length === 0) continue;
      const firstType = target[0].type as InstructionType;
      if (firstType !== "LEFT" && firstType !== "RIGHT") continue; // only turns can spin

      let needsFix = false;
      outer: for (let callerFi = 0; callerFi < functions.length; callerFi++) {
        const caller = functions[callerFi];
        for (let instrIdx = 0; instrIdx < caller.length; instrIdx++) {
          const inst = caller[instrIdx];
          if (inst.type !== "INVOKE" || (inst as any).index !== targetFi) continue;

          // Walk backwards from the INVOKE to find the last movement primitive
          // in the caller (skip any INVOKE instructions in between).
          let lastMove: InstructionType | null = null;
          for (let k = instrIdx - 1; k >= 0; k--) {
            const t = caller[k].type as InstructionType;
            if (t === "FORWARD" || t === "LEFT" || t === "RIGHT") { lastMove = t; break; }
          }

          if (lastMove === "LEFT" || lastMove === "RIGHT") {
            needsFix = true;
            break outer;
          }
        }
      }

      if (needsFix) {
        target[0] = { type: "FORWARD" } satisfies FunctionSlotInstruction;
      }
    }

    return functions;
  }

  private static generateSafeInstruction(
    currentFn: FunctionSlotInstruction[],
    totalFunctions: number,
    currentIndex: number,
    difficulty: number
  ): FunctionSlotInstruction {
    let options: InstructionType[] = ["FORWARD", "LEFT", "RIGHT"];

    if (totalFunctions > 1) options.push("INVOKE");

    // ── Invoke-chaining rules ──────────────────────────────────────────────
    // Inspect the raw tail of the function (not movement-filtered) to detect
    // consecutive INVOKE sequences, which have their own legality rules.
    const lastRaw         = currentFn.length > 0 ? currentFn[currentFn.length - 1] : null;
    const prevIsInvoke    = lastRaw?.type === "INVOKE";
    const prevInvokeHasColor = prevIsInvoke && !!(lastRaw as any).color;

    // Compute the target this INVOKE would call (used in duplicate checks below).
    const wouldTargetIndex = (currentIndex + 1) % totalFunctions;

    // Inspect any prior INVOKE to the same target already in this function.
    const priorInvokeToTarget = currentFn.find(
      inst => inst.type === "INVOKE" && (inst as any).index === wouldTargetIndex
    ) ?? null;
    const priorInvokeIsBare = priorInvokeToTarget !== null && !(priorInvokeToTarget as any).color;

    // Count how many consecutive INVOKEs are already at the end of the function.
    let consecutiveInvokes = 0;
    for (let k = currentFn.length - 1; k >= 0; k--) {
      if (currentFn[k].type === "INVOKE") consecutiveInvokes++;
      else break;
    }

    if (prevIsInvoke) {
      if (!prevInvokeHasColor) {
        // A bare INVOKE (no color condition) can never be followed by another
        // INVOKE — there is no conditional branching to distinguish them.
        options = options.filter(o => o !== "INVOKE");
      } else if (consecutiveInvokes >= 2) {
        // Cap colored-INVOKE chains at 2 to keep them rare and readable.
        options = options.filter(o => o !== "INVOKE");
      }
      // Otherwise (prev was a colored INVOKE and chain length < 2): INVOKE
      // remains in options but will be forced to carry a color below.
    }

    // ── Duplicate-target INVOKE rule ───────────────────────────────────────
    // Two INVOKEs to the same function are only legal when the FIRST one is
    // color-conditioned. A bare first INVOKE unconditionally transfers control,
    // so a second call to the same target is dead code after it.
    // • prior INVOKE exists and is bare  → ban INVOKE entirely for this slot
    // • prior INVOKE exists and is colored → second INVOKE is allowed (may be bare)
    if (priorInvokeIsBare) {
      options = options.filter(o => o !== "INVOKE");
    }

    // ── Movement-primitive history (skips INVOKE) ──────────────────────────
    // FIX 1: Walk back through history, skipping INVOKE, to find the last
    // movement primitives. This prevents INVOKE calls from consuming the
    // turn budget and masking the actual movement pattern.
    const movementHistory: InstructionType[] = [];
    for (let k = currentFn.length - 1; k >= 0 && movementHistory.length < 3; k--) {
      const t = currentFn[k].type as InstructionType;
      if (this.isMovementPrimitive(t)) movementHistory.push(t);
    }
    const prev1 = movementHistory[0] ?? null;
    const prev2 = movementHistory[1] ?? null;
    const prev3 = movementHistory[2] ?? null;

    // Anti-spin rule: if the last movement primitive was a turn, ban all turns.
    // This prevents L→R, R→L, L→L and R→R (U-turn) sequences.
    if (prev1 === "LEFT" || prev1 === "RIGHT") {
      options = options.filter(o => o !== "LEFT" && o !== "RIGHT");
    }
    // FIX 3: Wire up prev3 — prevent 3 consecutive forwards by forcing a turn decision.
    if (prev1 === "FORWARD" && prev2 === "FORWARD" && prev3 === "FORWARD") {
      options = options.filter(o => o !== "FORWARD");
    }
    // FIX 2: Soften the momentum rule — use a weighted pool instead of hard-forcing FORWARD.
    if (prev1 !== "FORWARD" && prev2 !== "FORWARD" && options.includes("FORWARD")) {
      options = ["FORWARD", "FORWARD", "FORWARD", ...options];
    }

    const type = this.getRandom(options);

    if (type === "INVOKE") {
      const targetIndex = (currentIndex + 1) % totalFunctions;
      const isLoop = targetIndex <= currentIndex;
      // A color condition is required when:
      //   • it's a recursive/loop call (always was), OR
      //   • it's chaining after another colored INVOKE (must stay conditional)
      const mustHaveColor = isLoop || prevInvokeHasColor;
      const useColor = mustHaveColor || (difficulty > 1 && this.random() > 0.5);
      const color = useColor ? this.getRandom(this.COLORS) : undefined;

      return { type: "INVOKE", index: targetIndex, color } as FunctionSlotInstruction;
    }

    const useColor = difficulty > 1 && this.random() > 0.8;
    const color = useColor ? this.getRandom(this.COLORS) : undefined;
    return { type, color } as FunctionSlotInstruction;
  }

  public static generate(difficulty: number): Level {
    // SNAP FIX: Previously `1 + Math.floor(difficulty * 2)` — a hard step function
    // that jumped from 1 → 2 functions at exactly 0.5, 2 → 3 at exactly 1.0, etc.
    // Now we interpolate continuously: the fractional part of (1 + difficulty * 2)
    // becomes the *probability* of rounding up, so at difficulty 0.3 you have a
    // 60% chance of 1 function and a 40% chance of 2 — a smooth gradient.
    const rawFn = 1 + difficulty * 2;
    const numFunctions = Math.min(5, Math.floor(rawFn) + (this.random() < (rawFn % 1) ? 1 : 0));

    const MAX_RETRIES = 50;

    // SNAP FIX: Both requirements used Math.floor, creating step cliffs.
    // Now they're continuous. Critically, REQUIRED_DISTANCE is now scaled to
    // be *achievable* at low difficulty — previously it was 5 even at difficulty 0,
    // but a single short function can only reach distance ~2-3, so the generator
    // always exhausted all 50 retries and fell back to the least-bad boring map.
    const REQUIRED_DISTANCE = 2 + difficulty * 6;  // 0→2, 0.5→5, 1→8
    const REQUIRED_TURNS = 1 + difficulty * 2;      // 0→1, 0.5→2, 1→3

    let bestLevel: Level | null = null;
    let maxDistSeen = -1;
    let bestDirChanges = 0;

    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      const functions = this.generateFunctions(numFunctions, difficulty);
      const path = new Map<string, Cell>();

      let x = 0, y = 0, dir: Direction = 0;
      let minX = 0, maxX = 0, minY = 0, maxY = 0;
      let stepsTaken = 0;
      const MAX_STEPS = 50 + (difficulty * 20);

      // FIX 5: Track direction changes during simulation.
      let dirChanges = 0;
      let prevDir: Direction = dir;

      path.set(`0,0`, 'S');

      const execute = (funcIndex: number) => {
        if (stepsTaken > MAX_STEPS) return;
        const instructions = functions[funcIndex];

        for (const inst of instructions) {
          if (stepsTaken > MAX_STEPS) break;
          stepsTaken++;

          if (inst.color) {
            const breakChance = Math.pow(stepsTaken / MAX_STEPS, 2);
            if (this.random() < breakChance) {
              continue;
            }
            const currentKey = `${x},${y}`;
            if (path.get(currentKey) !== 'S') path.set(currentKey, inst.color);
          }

          if (inst.type === "LEFT") {
            dir = (dir + 3) % 4 as Direction;
          } else if (inst.type === "RIGHT") {
            dir = (dir + 1) % 4 as Direction;
          } else if (inst.type === "FORWARD") {
            if (dir === 0) y--;
            else if (dir === 1) x++;
            else if (dir === 2) y++;
            else if (dir === 3) x--;

            minX = Math.min(minX, x); maxX = Math.max(maxX, x);
            minY = Math.min(minY, y); maxY = Math.max(maxY, y);

            const key = `${x},${y}`;
            if (!path.has(key)) path.set(key, '.');

            // FIX 5: Count each time we actually move in a new heading.
            if (dir !== prevDir) {
              dirChanges++;
              prevDir = dir;
            }
          } else if (inst.type === "INVOKE") {
            execute((inst as any).index);
          }
        }
      };

      execute(0);
			const endKey = `${x},${y}`;
			// TODO: Reject placing end on visited cells
			// if (path.has(endKey)) continue;
      path.set(endKey, 'E');

      const manhattanDistance = Math.abs(x) + Math.abs(y);

      const width = (maxX - minX) + 3;
      const height = (maxY - minY) + 3;
      const offsetX = Math.abs(minX) + 1;
      const offsetY = Math.abs(minY) + 1;
      const buffer = new Uint8Array(width * height).fill('*'.charCodeAt(0));

      path.forEach((cellType, key) => {
        const [cx, cy] = key.split(',').map(Number);
        buffer[(cy + offsetY) * width + (cx + offsetX)] = cellType.charCodeAt(0);
      });

      const levelData: Level = {
        width,
        height,
        functions,
        map: level(new TextDecoder().decode(buffer)),
      };

      // FIX 5: Track the best candidate by a composite score so fallback
      // also prefers maps that have both distance and turns.
      const score = manhattanDistance + dirChanges * 2;
      const bestScore = maxDistSeen + bestDirChanges * 2;
      if (score > bestScore) {
        maxDistSeen = manhattanDistance;
        bestDirChanges = dirChanges;
        bestLevel = levelData;
      }

      // Accept only if both distance AND turn-count requirements are met.
      if (manhattanDistance >= REQUIRED_DISTANCE && dirChanges >= REQUIRED_TURNS) {
        return levelData;
      }
    }

    return bestLevel!;
  }
}
