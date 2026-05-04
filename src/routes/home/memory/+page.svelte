<script lang="ts">
	import { Generator } from "$lib/games/memory.svelte";

	// ── Types ────────────────────────────────────────────────────────────────
	type Phase = "idle" | "watching" | "playing" | "win" | "lose";

	// ── State ────────────────────────────────────────────────────────────────
	const generator = new Generator("w2inc-seed");

	let difficulty  = $state(0.2);
	let phase       = $state<Phase>("idle");

	let gridSize    = $state(3);
	let sequence    = $state<number[]>([]);
	let lit         = $state<number | null>(null);   // cell flashing during watch
	let inputs      = $state<number[]>([]);           // player clicks so far
	let failCell    = $state<number | null>(null);    // wrong cell tapped

	// ── Derived helpers ──────────────────────────────────────────────────────
	let totalCells    = $derived(gridSize * gridSize);
	let progressLabel = $derived(`${inputs.length} / ${sequence.length}`);

	// ── Game logic ───────────────────────────────────────────────────────────
	function startGame() {
		const result = generator.generate(difficulty);
		gridSize  = result.gridSize;
		sequence  = result.sequence;
		inputs    = [];
		lit       = null;
		failCell  = null;size
		phase     = "watching";
		playSequence();
	}

	async function playSequence() {
		const wait = (ms: number) => new Promise<void>(r => setTimeout(r, ms));

		// Speed scales with difficulty: slower at 0, faster at 1
		const flashMs = Math.round(900 - difficulty * 550); // 900 ms → 350 ms
		const gapMs   = Math.round(400 - difficulty * 200); // 400 ms → 200 ms

		await wait(600); // brief "get ready" pause

		for (const idx of sequence) {
			lit = idx;
			await wait(flashMs);
			lit = null;
			await wait(gapMs);
		}

		phase = "playing";
	}

	function handleClick(idx: number) {
		if (phase !== "playing") return;

		const step = inputs.length;

		if (idx !== sequence[step]) {
			failCell = idx;
			phase    = "lose";
			return;
		}

		inputs = [...inputs, idx];
		if (inputs.length === sequence.length) phase = "win";
	}

	// ── Cell appearance ──────────────────────────────────────────────────────
	type CellStyle = "default" | "lit" | "done" | "fail";

	function cellStyle(idx: number): CellStyle {
		if (idx === lit)      return "lit";
		if (idx === failCell) return "fail";
		if (phase === "win" && sequence.includes(idx)) return "done";
		if (phase === "playing" && inputs.includes(idx)) return "done";
		return "default";
	}
</script>

<!-- ── Markup ──────────────────────────────────────────────────────────────── -->
<div class="root">

	<!-- Header -->
	<header>
		<h1>MEMORY<span class="accent">.</span></h1>
		<p class="sub">Watch the sequence — then repeat it.</p>
	</header>

	<!-- Controls (only in idle) -->
	{#if phase === "idle"}
	<section class="controls">
		<label>
			<span>Difficulty</span>
			<div class="slider-row">
				<span class="dim">easy</span>
				<input
					type="range" min="0" max="1" step="0.01"
					bind:value={difficulty}
				/>
				<span class="dim">hard</span>
			</div>
			<span class="diff-badge">
				{Math.round(difficulty * 100)}%
				&nbsp;·&nbsp; grid {Math.round(3 + difficulty * 6)}×{Math.round(3 + difficulty * 6)}
			</span>
		</label>
		<button class="btn-start" onclick={startGame}>Start</button>
	</section>
	{/if}

	<!-- Phase banner (watching / playing) -->
	{#if phase === "watching"}
		<div class="banner watching">👁  Watch carefully…</div>
	{:else if phase === "playing"}
		<div class="banner playing">
			<span>Your turn</span>
			<span class="progress">{progressLabel}</span>
		</div>
	{:else if phase === "win"}
		<div class="banner win">✓ Perfect! You nailed it.</div>
	{:else if phase === "lose"}
		<div class="banner lose">✗ Wrong cell — better luck next time.</div>
	{/if}

	<!-- Grid -->
	<div
		class="grid"
		style="
			grid-template-columns: repeat({gridSize}, 1fr);
			--size: {gridSize};
		"
	>
		{#each { length: totalCells } as _, idx}
			{@const style = cellStyle(idx)}
			<button
				class="cell {style}"
				disabled={phase !== "playing"}
				onclick={() => handleClick(idx)}
				aria-label="Cell {idx}"
			></button>
		{/each}
	</div>

	<!-- Post-game actions -->
	{#if phase === "win" || phase === "lose"}
	<div class="actions">
		<button class="btn-start" onclick={startGame}>Play again</button>
		<button class="btn-ghost" onclick={() => (phase = "idle")}>Change difficulty</button>
	</div>
	{/if}

</div>

<!-- ── Styles ──────────────────────────────────────────────────────────────── -->
<style>
	/* ── Tokens ── */
	:root {
		--bg:       #0d0f14;
		--surface:  #161a22;
		--border:   #252b38;
		--text:     #c8d0de;
		--dim:      #55607a;
		--accent:   #4af0b2;
		--danger:   #f05a4a;
		--radius:   6px;
	}

	/* ── Layout ── */
	.root {
		min-height: 100vh;
		background: var(--bg);
		color:      var(--text);
		font-family: 'JetBrains Mono', 'Fira Code', monospace;
		display:    flex;
		flex-direction: column;
		align-items: center;
		gap: 2rem;
		padding: 3rem 1.5rem 4rem;
	}

	/* ── Header ── */
	header { text-align: center; }

	h1 {
		font-size: clamp(2rem, 6vw, 3.5rem);
		font-weight: 700;
		letter-spacing: .18em;
		color: #fff;
		margin: 0;
	}

	.accent { color: var(--accent); }

	.sub {
		margin: .4rem 0 0;
		font-size: .85rem;
		color: var(--dim);
		letter-spacing: .06em;
	}

	/* ── Controls ── */
	.controls {
		display:       flex;
		flex-direction: column;
		align-items:   center;
		gap:           1.4rem;
		background:    var(--surface);
		border:        1px solid var(--border);
		border-radius: var(--radius);
		padding:       2rem 2.5rem;
		width:         min(380px, 100%);
	}

	label {
		display:       flex;
		flex-direction: column;
		gap:           .5rem;
		width:         100%;
		font-size:     .8rem;
		letter-spacing: .08em;
		text-transform: uppercase;
		color:         var(--dim);
	}

	.slider-row {
		display:     flex;
		align-items: center;
		gap:         .6rem;
	}

	input[type="range"] {
		flex:             1;
		accent-color:     var(--accent);
		height:           4px;
		cursor:           pointer;
	}

	.dim { font-size: .72rem; color: var(--dim); }

	.diff-badge {
		color:      var(--accent);
		font-size:  .78rem;
		letter-spacing: .04em;
	}

	/* ── Buttons ── */
	.btn-start {
		background:    var(--accent);
		color:         #0d0f14;
		border:        none;
		border-radius: var(--radius);
		padding:       .7rem 2.2rem;
		font-family:   inherit;
		font-size:     .9rem;
		font-weight:   700;
		letter-spacing: .1em;
		text-transform: uppercase;
		cursor:        pointer;
		transition:    opacity .15s, transform .1s;
	}

	.btn-start:hover  { opacity: .85; }
	.btn-start:active { transform: scale(.97); }

	.btn-ghost {
		background:    transparent;
		color:         var(--dim);
		border:        1px solid var(--border);
		border-radius: var(--radius);
		padding:       .65rem 1.8rem;
		font-family:   inherit;
		font-size:     .8rem;
		letter-spacing: .06em;
		cursor:        pointer;
		transition:    color .15s, border-color .15s;
	}

	.btn-ghost:hover { color: var(--text); border-color: var(--dim); }

	/* ── Phase banners ── */
	.banner {
		font-size:     .85rem;
		letter-spacing: .1em;
		text-transform: uppercase;
		padding:       .6rem 1.4rem;
		border-radius: var(--radius);
		display:       flex;
		align-items:   center;
		gap:           1.4rem;
	}

	.watching { background: #1a1f2e; color: #8ba3d6; border: 1px solid #2a3555; }
	.playing  { background: #0e1f1a; color: var(--accent); border: 1px solid #1a4035; }
	.win      { background: #0e1f1a; color: var(--accent); border: 1px solid var(--accent); }
	.lose     { background: #1f0f0e; color: var(--danger); border: 1px solid var(--danger); }

	.progress { font-size: .75rem; color: var(--dim); }

	/* ── Grid ── */
	.grid {
		display:    grid;
		gap:        clamp(3px, calc(8px - var(--size, 3) * 0.5px), 8px);
		width:      min(560px, 92vw);
	}

	/* ── Cells ── */
	.cell {
		aspect-ratio: 1;
		border-radius: clamp(3px, calc(8px - var(--size, 3) * 0.6px), 8px);
		border:     1px solid var(--border);
		background: var(--surface);
		cursor:     pointer;
		transition: background .12s, border-color .12s, box-shadow .12s, transform .08s;
	}

	.cell:hover:not(:disabled) {
		background:    #1e2535;
		border-color:  #3a4560;
	}

	.cell:active:not(:disabled) { transform: scale(.93); }

	/* Flashing during watch phase */
	.cell.lit {
		background:   var(--accent);
		border-color: var(--accent);
		box-shadow:   0 0 18px 4px color-mix(in srgb, var(--accent) 50%, transparent);
		animation:    pulse .25s ease-out;
	}

	/* Correctly clicked */
	.cell.done {
		background:  #1a3d30;
		border-color: color-mix(in srgb, var(--accent) 40%, transparent);
	}

	/* Wrong click */
	.cell.fail {
		background:  var(--danger);
		border-color: var(--danger);
		box-shadow:  0 0 16px 4px color-mix(in srgb, var(--danger) 50%, transparent);
	}

	.cell:disabled { cursor: default; }

	/* ── Actions row ── */
	.actions {
		display:     flex;
		gap:         .8rem;
		flex-wrap:   wrap;
		justify-content: center;
	}

	/* ── Animation ── */
	@keyframes pulse {
		0%   { transform: scale(1.05); }
		100% { transform: scale(1); }
	}
</style>
