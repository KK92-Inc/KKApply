<script lang="ts">
	import * as Page from "../index.svelte";
	import * as Memory from "./memory.remote";
	import {
		Eye,
		Hand,
		RotateCcw,
		CheckCheck,
		Loader2,
		TriangleAlert,
	} from "@lucide/svelte";
	import { cn } from "$lib/utils";
	import Button from "$lib/components/button/button.svelte";
	import { goto } from "$app/navigation";
	import { isHttpError } from "@sveltejs/kit";

	type Phase = "start" | "watching" | "playing" | "submitting";

	const context = Page.get();
	const [event, userEvent] = await Promise.all([
		context.event,
		context.userEvent,
	]);

	let game = $state(await Memory.current(userEvent.id));
	let phase = $state<Phase>("start");
	let userSequence = $state<number[]>([]);
	let activeCell = $state<number | null>(null);
	let watchStep = $state(0);
	let error = $state<string | null>(null);

	// ── Derived ────────────────────────────────────────────────────────────────

	const totalCells = $derived(game.size * game.size);
	const isComplete = $derived(userSequence.length === game.sequence.length);
	const stepDuration = $derived(Math.max(350, 650 - game.sequence.length * 10));
	const gapDuration = $derived(Math.max(150, 300 - game.sequence.length * 5));

	// ── Game logic ─────────────────────────────────────────────────────────────

	async function startWatching() {
		phase = "watching";
		error = null;
		userSequence = [];
		activeCell = null;
		watchStep = 0;

		for (let i = 0; i < game.sequence.length; i++) {
			watchStep = i + 1;
			activeCell = game.sequence[i]!;
			await sleep(stepDuration);
			activeCell = null;
			await sleep(gapDuration);
		}

		watchStep = 0;
		phase = "playing";
	}

	function handleCellClick(cellIndex: number) {
		if (phase !== "playing") return;
		if (isComplete) return;
		if (userSequence.includes(cellIndex)) return;

		error = null;
		userSequence = [...userSequence, cellIndex];
	}

	async function handleSubmit() {
		if (!isComplete || phase === "submitting") return;
		phase = "submitting";
		error = null;

		try {
			const next = await Memory.submit({
				userEventId: userEvent.id,
				sequence: userSequence,
			});

			if ("completed" in next) {
				await goto("/home");
				return;
			}

			game = next;
			phase = "start";
			userSequence = [];
			activeCell = null;
		} catch (err) {
			if (isHttpError(err) && err.status === 422) {
				error = "Wrong sequence — try again.";
				userSequence = [];
			} else {
				error = "Something went wrong. Please retry.";
				console.error(err);
			}
			phase = "playing";
		}
	}

	function resetSelection() {
		userSequence = [];
		error = null;
	}

	function selectionOrder(cellIndex: number): number {
		return userSequence.indexOf(cellIndex) + 1;
	}

	function sleep(ms: number): Promise<void> {
		return new Promise((res) => setTimeout(res, ms));
	}
</script>

<div
	class="min-h-screen bg-background flex flex-col items-center justify-center gap-8 p-6 font-mono select-none"
>
	<!-- Header ---------------------------------------------------------------->
	<div class="flex flex-col items-center gap-2 text-center">
		<p class="text-[10px] uppercase tracking-[0.3em] text-muted-foreground">
			Memory Sequence
		</p>

		<div class="flex items-center gap-2 h-6">
			{#if phase === "start"}
				<span class="text-foreground text-sm tracking-widest uppercase"
					>Ready</span
				>
			{:else if phase === "watching"}
				<Eye class="w-4 h-4 text-amber-500 animate-pulse" />
				<span class="text-amber-500 text-sm tracking-widest uppercase">
					Watch — {watchStep} / {game.sequence.length}
				</span>
			{:else if phase === "playing"}
				<Hand class="w-4 h-4 text-primary" />
				<span class="text-foreground text-sm tracking-widest uppercase">
					Repeat — {userSequence.length} / {game.sequence.length}
				</span>
			{:else if phase === "submitting"}
				<Loader2 class="w-4 h-4 text-muted-foreground animate-spin" />
				<span class="text-muted-foreground text-sm tracking-widest uppercase"
					>Checking…</span
				>
			{/if}
		</div>

		<!-- Sequence progress pips -->
		<div class="flex flex-wrap justify-center gap-1 mt-1 max-w-xs">
			{#each { length: game.sequence.length } as _, i}
				<div
					id={`pip-${i}`}
					class={cn(
						"h-[2px] w-4 rounded-full transition-colors duration-200",
						phase === "watching" && i < watchStep
							? "bg-amber-500"
							: phase === "playing" && i < userSequence.length
								? "bg-primary"
								: "bg-border",
					)}
				></div>
			{/each}
		</div>
	</div>

	<!-- Error banner ---------------------------------------------------------->
	{#if error}
		<div
			class="flex items-center gap-2 px-4 py-2 rounded-md border border-destructive/40 bg-destructive/10 text-destructive text-xs tracking-wide"
		>
			<TriangleAlert class="w-3.5 h-3.5 shrink-0" />
			{error}
		</div>
	{/if}

	<!-- Grid ------------------------------------------------------------------>
	<div
		class="grid gap-2"
		style="
			grid-template-columns: repeat({game.size}, 4rem);
			grid-template-rows:    repeat({game.size}, 4rem);
		"
	>
		{#each { length: totalCells } as _, cellIndex}
			{@const order = selectionOrder(cellIndex)}
			{@const isActive = activeCell === cellIndex}
			{@const isSelected = order > 0}
			{@const isClickable = phase === "playing" && !isSelected && !isComplete}

			<button
				onclick={() => handleCellClick(cellIndex)}
				disabled={!isClickable}
				class={cn(
					"relative rounded-md border text-xs font-bold",
					"flex items-center justify-center overflow-hidden",
					"transition-all duration-150",

					// Default
					"bg-card border-2 text-muted-foreground",

					// Watching active — amber glow
					isActive && [
						"bg-amber-500 border-amber-400 text-amber-950",
						"shadow-[0_0_18px_4px_--theme(--color-amber-500/40%)] scale-105",
					],

					// User selected — uses primary token
					isSelected &&
						!isActive &&
						"bg-primary/15 border-primary text-primary",

					// Hoverable
					isClickable &&
						"cursor-pointer hover:bg-accent hover:border-ring hover:scale-105",

					// Dimmed states
					phase === "watching" && !isActive && "opacity-25",
					phase === "submitting" && "opacity-40 cursor-default",
				)}
			>
				{#if isSelected}
					<span class="text-[10px] tabular-nums leading-none">{order}</span>
				{/if}

				{#if isActive}
					<span
						class="absolute inset-0 rounded-md bg-amber-400/30 animate-ping"
						style="animation-duration: 0.45s"
					></span>
				{/if}
			</button>
		{/each}
	</div>

	<!-- Meta strip ----------------------------------------------------------->
	<div
		class="flex gap-6 text-[10px] text-muted-foreground/50 tracking-widest uppercase"
	>
		<span>Grid {game.size}x{game.size}</span>
		<span>Seq {game.sequence.length}</span>
		<span>Diff {Math.round(game.difficulty * 100)}%</span>
	</div>

	<!-- Actions -------------------------------------------------------------->
	<div class="flex gap-3">
		{#if phase === "start"}
			<Button
				onclick={startWatching}
				class="gap-2 tracking-widest uppercase text-xs"
			>
				<Eye class="w-3.5 h-3.5" />
				Watch Sequence
			</Button>
		{:else if phase === "playing"}
			{#if userSequence.length > 0}
				<Button
					variant="ghost"
					onclick={resetSelection}
					class="gap-2 tracking-widest uppercase text-xs text-muted-foreground"
				>
					<RotateCcw class="w-3.5 h-3.5" />
					Reset
				</Button>
			{/if}

			<Button
				onclick={handleSubmit}
				disabled={!isComplete}
				class="gap-2 tracking-widest uppercase text-xs"
			>
				<CheckCheck class="w-3.5 h-3.5" />
				Submit
			</Button>
		{:else if phase === "submitting"}
			<Button
				disabled
				class="gap-2 tracking-widest uppercase text-xs opacity-50"
			>
				<Loader2 class="w-3.5 h-3.5 animate-spin" />
				Verifying…
			</Button>
		{/if}
	</div>
</div>
