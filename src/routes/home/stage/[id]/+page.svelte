<script lang="ts">
	import { Generator } from "./game2.svelte";
	import type { FunctionSlotInstruction } from "./game2.svelte";

	let generator = new Generator("debug-seed");
	let density = $state(10);
	let difficulty = $derived(density / 100);
	let sample = $derived(generator.generate(difficulty));
	let cells = $derived(sample.map.split(""));

	// Compute stats from the generated level
	let stats = $derived.by(() => {
		const chars = sample.map.split("");
		const pathTiles = chars.filter(c => c === "." || c === "S" || c === "E" || ["R","G","B"].includes(c)).length;
		const colorTiles = chars.filter(c => ["R","G","B"].includes(c)).length;
		const totalInstructions = sample.functions.reduce((s, f) => s + f.length, 0);
		const invokeCount = sample.functions.flat().filter(i => i.type === "INVOKE").length;

		// Find start and end positions for distance
		let sx = 0, sy = 0, ex = 0, ey = 0;
		chars.forEach((c, i) => {
			if (c === "S") { sx = i % sample.width; sy = Math.floor(i / sample.width); }
			if (c === "E") { ex = i % sample.width; ey = Math.floor(i / sample.width); }
		});
		const manhattan = Math.abs(ex - sx) + Math.abs(ey - sy);

		return { pathTiles, colorTiles, totalInstructions, invokeCount, manhattan };
	});

	const INST_COLORS: Record<string, string> = {
		FORWARD: "#4ade80",
		LEFT:    "#60a5fa",
		RIGHT:   "#f472b6",
		INVOKE:  "#fb923c",
	};

	const INST_ICONS: Record<string, string> = {
		FORWARD: "↑",
		LEFT:    "←",
		RIGHT:   "→",
		INVOKE:  "ƒ",
	};

	const COLOR_SWATCHES: Record<string, string> = {
		R: "#ef4444",
		G: "#22c55e",
		B: "#3b82f6",
	};

	function regenWithSameDifficulty() {
		// force a reactive update by toggling density slightly
		density = density;
		sample = generator.generate(difficulty);
	}
</script>

<div class="debug-root">
	<!-- ─── Header ─────────────────────────────────────────── -->
	<header>
		<div class="title-row">
			<span class="badge">GEN</span>
			<h1>Map Debug</h1>
		</div>
		<div class="controls">
			<button class="regen-btn" onclick={() => regenWithSameDifficulty()}>
				<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
					<path d="M1 4v6h6"/><path d="M23 20v-6h-6"/>
					<path d="M20.49 9A9 9 0 0 0 5.64 5.64L1 10m22 4l-4.64 4.36A9 9 0 0 1 3.51 15"/>
				</svg>
				Regenerate
			</button>
			<div class="slider-group">
				<label for="diff-slider">Difficulty</label>
				<input id="diff-slider" type="range" min="0" max="100" step="1" bind:value={density} />
				<span class="diff-value">{density}%</span>
			</div>
		</div>
	</header>

	<!-- ─── Main layout ────────────────────────────────────── -->
	<main>
		<!-- Left: map + stats -->
		<section class="left-col">
			<!-- Stat pills -->
			<div class="stat-pills">
				<div class="pill">
					<span class="pill-label">Size</span>
					<span class="pill-value">{sample.width}×{sample.height}</span>
				</div>
				<div class="pill">
					<span class="pill-label">Path</span>
					<span class="pill-value">{stats.pathTiles} tiles</span>
				</div>
				<div class="pill">
					<span class="pill-label">Distance</span>
					<span class="pill-value">{stats.manhattan}</span>
				</div>
				<div class="pill">
					<span class="pill-label">Colors</span>
					<span class="pill-value">{stats.colorTiles}</span>
				</div>
				<div class="pill">
					<span class="pill-label">Fns</span>
					<span class="pill-value">{sample.functions.length}</span>
				</div>
				<div class="pill">
					<span class="pill-label">Instructions</span>
					<span class="pill-value">{stats.totalInstructions}</span>
				</div>
			</div>

			<!-- Map grid -->
			<div
				class="map-grid"
				style="--cols: {sample.width}; --rows: {sample.height};"
			>
				{#each cells as cell, i}
					<div
						class="cell"
						class:wall={cell === "*"}
						class:path={cell === "."}
						class:start={cell === "S"}
						class:goal={cell === "E"}
						class:col-r={cell === "R"}
						class:col-g={cell === "G"}
						class:col-b={cell === "B"}
					>
						{#if cell === "S"}
							<span class="cell-icon">🚀</span>
						{:else if cell === "E"}
							<span class="cell-icon">🎯</span>
						{/if}
					</div>
				{/each}
			</div>

			<!-- Raw map string -->
			<details class="raw-section">
				<summary>Raw map string</summary>
				<pre class="raw-map">{sample.map.split("").reduce((acc, c, i) =>
					acc + c + ((i + 1) % sample.width === 0 ? "\n" : ""), "")}</pre>
			</details>
		</section>

		<!-- Right: functions -->
		<section class="right-col">
			<h2 class="section-title">Functions</h2>
			<div class="fn-list">
				{#each sample.functions as func, fi}
					<div class="fn-card">
						<div class="fn-header">
							<span class="fn-label">F{fi + 1}</span>
							<span class="fn-count">{func.length} instructions</span>
						</div>
						<div class="fn-body">
							{#each func as inst, ii}
								{@const itype = inst.type as string}
								{@const color = (inst as any).color as string | undefined}
								{@const invokeIndex = (inst as any).index as number | undefined}
								<div class="inst-row">
									<span class="inst-index">{ii + 1}</span>
									<span
										class="inst-chip"
										style="--chip-color: {INST_COLORS[itype] ?? '#999'};"
									>
										{INST_ICONS[itype] ?? "?"} {itype}
										{#if invokeIndex !== undefined}
											<span class="invoke-target">→ F{invokeIndex + 1}</span>
										{/if}
									</span>
									{#if color}
										<span
											class="color-dot"
											style="background: {COLOR_SWATCHES[color] ?? '#fff'};"
											title="Color condition: {color}"
										></span>
									{/if}
								</div>
							{/each}
						</div>
					</div>
				{/each}
			</div>
		</section>
	</main>
</div>

<style>
	/* ── Reset & root ─────────────────────────────── */
	.debug-root {
		min-height: 100vh;
		background: #0c0c0f;
		color: #e2e2e8;
		font-family: 'JetBrains Mono', 'Fira Mono', 'Cascadia Code', monospace;
		padding: 1.5rem;
		box-sizing: border-box;
	}

	/* ── Header ───────────────────────────────────── */
	header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		flex-wrap: wrap;
		gap: 1rem;
		margin-bottom: 1.75rem;
		padding-bottom: 1rem;
		border-bottom: 1px solid #1e1e28;
	}

	.title-row {
		display: flex;
		align-items: center;
		gap: 0.75rem;
	}

	h1 {
		margin: 0;
		font-size: 1.25rem;
		font-weight: 700;
		letter-spacing: -0.02em;
		color: #fff;
	}

	.badge {
		background: #22c55e22;
		color: #4ade80;
		border: 1px solid #4ade8044;
		padding: 0.1rem 0.45rem;
		border-radius: 4px;
		font-size: 0.65rem;
		font-weight: 700;
		letter-spacing: 0.08em;
	}

	.controls {
		display: flex;
		align-items: center;
		gap: 1.25rem;
		flex-wrap: wrap;
	}

	.regen-btn {
		display: flex;
		align-items: center;
		gap: 0.4rem;
		background: #1a1a24;
		border: 1px solid #2e2e3e;
		color: #c8c8d8;
		padding: 0.4rem 0.85rem;
		border-radius: 6px;
		font-family: inherit;
		font-size: 0.8rem;
		cursor: pointer;
		transition: border-color 0.15s, color 0.15s;
	}

	.regen-btn:hover {
		border-color: #4ade80;
		color: #4ade80;
	}

	.slider-group {
		display: flex;
		align-items: center;
		gap: 0.6rem;
		font-size: 0.8rem;
		color: #888;
	}

	.slider-group label { color: #aaa; }

	input[type="range"] {
		-webkit-appearance: none;
		width: 120px;
		height: 4px;
		background: #2a2a38;
		border-radius: 2px;
		outline: none;
	}

	input[type="range"]::-webkit-slider-thumb {
		-webkit-appearance: none;
		width: 14px;
		height: 14px;
		border-radius: 50%;
		background: #4ade80;
		cursor: pointer;
	}

	.diff-value {
		color: #4ade80;
		min-width: 3ch;
		font-weight: 600;
	}

	/* ── Main layout ──────────────────────────────── */
	main {
		display: grid;
		grid-template-columns: auto 1fr;
		gap: 2rem;
		align-items: start;
	}

	@media (max-width: 860px) {
		main { grid-template-columns: 1fr; }
	}

	/* ── Stat pills ───────────────────────────────── */
	.stat-pills {
		display: flex;
		flex-wrap: wrap;
		gap: 0.5rem;
		margin-bottom: 1rem;
	}

	.pill {
		display: flex;
		flex-direction: column;
		background: #13131c;
		border: 1px solid #1e1e2e;
		border-radius: 6px;
		padding: 0.3rem 0.65rem;
		min-width: 56px;
	}

	.pill-label {
		font-size: 0.6rem;
		color: #555;
		text-transform: uppercase;
		letter-spacing: 0.06em;
	}

	.pill-value {
		font-size: 0.85rem;
		color: #d0d0e0;
		font-weight: 600;
		margin-top: 0.1rem;
	}

	/* ── Map grid ─────────────────────────────────── */
	.map-grid {
		display: grid;
		grid-template-columns: repeat(var(--cols), 1.8rem);
		grid-template-rows:    repeat(var(--rows), 1.8rem);
		gap: 1px;
		background: #1a1a24;
		border: 1px solid #1e1e2e;
		border-radius: 8px;
		padding: 2px;
		width: max-content;
	}

	.cell {
		width: 1.8rem;
		height: 1.8rem;
		display: flex;
		align-items: center;
		justify-content: center;
		background: #18181f;
		border-radius: 2px;
		font-size: 1rem;
		position: relative;
	}

	.wall  { background: #0d0d12; }
	.path  { background: #1f2030; }
	.start { background: #0f2a1a; box-shadow: inset 0 0 0 1px #4ade8055; }
	.goal  { background: #2a0f1a; box-shadow: inset 0 0 0 1px #f4728055; }

	.col-r { background: #1f1212; box-shadow: inset 0 0 0 2px #ef444466; }
	.col-g { background: #121f12; box-shadow: inset 0 0 0 2px #22c55e66; }
	.col-b { background: #12121f; box-shadow: inset 0 0 0 2px #3b82f666; }

	.cell-icon { font-size: 0.95rem; line-height: 1; }

	/* ── Raw map ──────────────────────────────────── */
	.raw-section {
		margin-top: 1rem;
		max-width: 100%;
	}

	.raw-section summary {
		font-size: 0.75rem;
		color: #555;
		cursor: pointer;
		user-select: none;
		margin-bottom: 0.5rem;
	}

	.raw-section summary:hover { color: #888; }

	.raw-map {
		background: #10101a;
		border: 1px solid #1e1e2e;
		border-radius: 6px;
		padding: 0.75rem 1rem;
		font-size: 0.75rem;
		color: #666;
		line-height: 1.4;
		overflow-x: auto;
		margin: 0;
	}

	/* ── Right col / functions ────────────────────── */
	.right-col { min-width: 0; }

	.section-title {
		font-size: 0.7rem;
		text-transform: uppercase;
		letter-spacing: 0.1em;
		color: #444;
		margin: 0 0 1rem 0;
		font-weight: 600;
	}

	.fn-list {
		display: flex;
		flex-direction: column;
		gap: 0.85rem;
	}

	.fn-card {
		background: #13131c;
		border: 1px solid #1e1e2e;
		border-radius: 8px;
		overflow: hidden;
	}

	.fn-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 0.5rem 0.85rem;
		border-bottom: 1px solid #1a1a26;
		background: #0f0f18;
	}

	.fn-label {
		font-size: 0.8rem;
		font-weight: 700;
		color: #60a5fa;
		letter-spacing: 0.04em;
	}

	.fn-count {
		font-size: 0.65rem;
		color: #444;
	}

	.fn-body {
		padding: 0.6rem 0.85rem;
		display: flex;
		flex-direction: column;
		gap: 0.4rem;
	}

	.inst-row {
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}

	.inst-index {
		font-size: 0.65rem;
		color: #333;
		width: 1.2rem;
		text-align: right;
		flex-shrink: 0;
	}

	.inst-chip {
		display: inline-flex;
		align-items: center;
		gap: 0.3rem;
		background: color-mix(in srgb, var(--chip-color) 12%, transparent);
		border: 1px solid color-mix(in srgb, var(--chip-color) 30%, transparent);
		color: var(--chip-color);
		padding: 0.15rem 0.55rem;
		border-radius: 4px;
		font-size: 0.75rem;
		font-weight: 600;
		letter-spacing: 0.03em;
	}

	.invoke-target {
		font-size: 0.65rem;
		opacity: 0.7;
		font-weight: 400;
	}

	.color-dot {
		width: 8px;
		height: 8px;
		border-radius: 50%;
		flex-shrink: 0;
		box-shadow: 0 0 4px currentColor;
	}
</style>
