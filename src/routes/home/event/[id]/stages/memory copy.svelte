<script lang="ts">
	import * as Page from "../index.svelte";
	import * as Memory from "./memory.remote";
	import * as Event from "$lib/remotes/event.remote";
	import {
		Eye,
		Hand,
		RotateCcw,
		CheckCheck,
		Loader2,
		TriangleAlert,
		Brain,
		PartyPopper,
		House,
		Timer,
	} from "@lucide/svelte";
	import { cn } from "$lib/utils";
	import Button from "$lib/components/button/button.svelte";
	import { goto, invalidateAll } from "$app/navigation";
	import { isHttpError } from "@sveltejs/kit";

	// ── Types ──────────────────────────────────────────────────────────────────

	type Phase = "intro" | "watching" | "playing" | "submitting" | "finished";

	// ── Bootstrap ──────────────────────────────────────────────────────────────

	const context = Page.get();
	let userEvent = $derived(await context.userEvent);
	let game = $derived(await Memory.current(userEvent.id));

	// ── Timer (30 min) ─────────────────────────────────────────────────────────

	const DURATION_MS = 30 * 60 * 1000;

	let startedAt = $derived<number | null>(null); // ms timestamp
	let now = $state(Date.now());

	$effect(() => {
		const id = setInterval(() => {
			now = Date.now();
		}, 1000);
		return () => clearInterval(id);
	});

	const elapsed = $derived(startedAt !== null ? now - startedAt : 0);
	const remaining = $derived(Math.max(0, DURATION_MS - elapsed));
	const timerProgress = $derived(startedAt !== null ? elapsed / DURATION_MS : 0); // 0→1
	const timerExpired = $derived(startedAt !== null && remaining === 0);

	const remainingLabel = $derived(() => {
		const s = Math.floor(remaining / 1000);
		const m = Math.floor(s / 60);
		const sec = s % 60;
		return `${m}:${sec.toString().padStart(2, "0")}`;
	});

	// Fire expiry once when the timer hits zero
	$effect(() => {
		if (timerExpired && phase !== "finished" && phase !== "submitting") {
			handleExpiry();
		}
	});

	// ── Game state ─────────────────────────────────────────────────────────────

	let phase = $derived<Phase>(userEvent.startedAt ? "watching" : "intro");
	let userSequence = $state<number[]>([]);
	let active = $state<number | null>(null);
	let watching = $state(0);
	let error = $state<string | null>(null);

	// ── Derived ────────────────────────────────────────────────────────────────

	const totalCells = $derived(game.size * game.size);
	const isSequenceComplete = $derived(userSequence.length === game.sequence.length);
	const stepDuration = $derived(Math.max(350, 650 - game.sequence.length * 10));
	const gapDuration = $derived(Math.max(150, 300 - game.sequence.length * 5));

	// ── Actions ────────────────────────────────────────────────────────────────

	/** Stub: mark the UserEvent as started on the server */
	async function startEvent() {
		await Event.start({ eventId: userEvent.eventId, userId: userEvent.userId });
		await invalidateAll();
		await doWatch();
	}

	async function doWatch() {
		phase = "watching";
		error = null;
		userSequence = [];
		active = null;
		watching = 0;

		for (let i = 0; i < game.sequence.length; i++) {
			watching = i + 1;
			active = game.sequence[i]!;
			await sleep(stepDuration);
			active = null;
			await sleep(gapDuration);
		}

		watching = 0;
		phase = "playing";
	}

	function onClick(cellIndex: number) {
		if (phase !== "playing") return;
		if (isSequenceComplete) return;
		if (userSequence.includes(cellIndex)) return;
		error = null;
		userSequence = [...userSequence, cellIndex];
	}

	async function onSubmit(sequence = userSequence) {
		if (phase === "submitting" || phase === "finished") return;
		phase = "submitting";
		error = null;

		try {
			const next = await Memory.submit({
				userEventId: userEvent.id,
				sequence,
			});

			if ("completed" in next) {
				phase = "finished";
				return;
			}

			game = next;
			phase = "start" as Phase; // reset to watch-ready state
			userSequence = [];
			active = null;
			// Immediately start the next watch round
			await doWatch();
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

	async function handleExpiry() {
		// Submit empty sequence — backend will detect timeout and return completed
		await onSubmit([]);
	}

	function reset() {
		userSequence = [];
		error = null;
	}

	function sleep(ms: number): Promise<void> {
		return new Promise((res) => setTimeout(res, ms));
	}
</script>

<!-- ═══════════════════════════════════════════════════════════════════════════
     SNIPPETS
     ═══════════════════════════════════════════════════════════════════════════ -->

{JSON.stringify({
	phase,
	userSequence,
	active,
	watching,
	error,
	startedAt,
	remainingLabel,
	timerProgress,
	timerExpired,
})}

<!-- ── Timer bar (shared across game + finish) ──────────────────────────────-->
{#snippet timerBar()}
	{@const danger = timerProgress > 0.85}
	<div class="w-full max-w-lg px-6">
		<div class="flex items-center justify-between mb-1">
			<span class="flex items-center gap-1.5 text-[10px] tracking-widest uppercase text-muted-foreground">
				<Timer class="w-3 h-3" />
				Time remaining
			</span>
			<span class={cn(
				"text-[10px] tabular-nums font-mono tracking-widest",
				danger ? "text-destructive animate-pulse" : "text-muted-foreground",
			)}>
				{remainingLabel()}
			</span>
		</div>
		<div class="h-1 w-full rounded-full bg-border overflow-hidden">
			<div
				class={cn(
					"h-full rounded-full transition-all duration-1000 ease-linear",
					danger ? "bg-destructive" : "bg-primary",
				)}
				style="width: {Math.min(timerProgress * 100, 100)}%"
			></div>
		</div>
	</div>
{/snippet}

<!-- ── Intro ─────────────────────────────────────────────────────────────────-->
{#snippet intro()}
	<div class="flex flex-col items-center gap-8 max-w-sm text-center">
		<!-- Icon -->
		<div class="rounded-full bg-primary/10 border border-primary/20 p-6">
			<Brain class="w-12 h-12 text-primary" />
		</div>

		<!-- Copy -->
		<div class="flex flex-col gap-2">
			<h1 class="text-xl font-semibold tracking-tight text-foreground">
				Memory Sequence
			</h1>
			<p class="text-sm text-muted-foreground leading-relaxed">
				You'll be shown a sequence of cells lighting up on a grid. Watch
				carefully, then repeat the exact order by clicking the cells.
			</p>
			<p class="text-sm text-muted-foreground leading-relaxed">
				Each correct round unlocks the next — harder — stage. You have
				<span class="text-foreground font-medium">30 minutes</span> once you
				start.
			</p>
		</div>

		<!-- Rules list -->
		<ul class="w-full text-left text-xs text-muted-foreground space-y-2 border border-border rounded-lg p-4 bg-card">
			<li class="flex gap-2">
				<Eye class="w-3.5 h-3.5 mt-0.5 shrink-0 text-amber-500" />
				<span>Watch the sequence light up in amber.</span>
			</li>
			<li class="flex gap-2">
				<Hand class="w-3.5 h-3.5 mt-0.5 shrink-0 text-primary" />
				<span>Click the cells in the same order.</span>
			</li>
			<li class="flex gap-2">
				<CheckCheck class="w-3.5 h-3.5 mt-0.5 shrink-0 text-foreground" />
				<span>Submit when you've selected all cells.</span>
			</li>
			<li class="flex gap-2">
				<RotateCcw class="w-3.5 h-3.5 mt-0.5 shrink-0 text-muted-foreground" />
				<span>You can replay or reset your selection at any time.</span>
			</li>
		</ul>

		<Button onclick={startEvent} class="gap-2 w-full tracking-widest uppercase text-xs">
			Start Challenge
		</Button>
	</div>
{/snippet}

<!-- ── Game ──────────────────────────────────────────────────────────────────-->
{#snippet gameView()}
	<!-- Status header -->
	<div class="flex flex-col items-center gap-2 text-center">
		<p class="text-[10px] uppercase tracking-[0.3em] text-muted-foreground">
			Memory Sequence
		</p>

		<div class="flex items-center gap-2 h-6">
			{#if phase === "watching"}
				<Eye class="w-4 h-4 text-amber-500 animate-pulse" />
				<span class="text-amber-500 text-sm tracking-widest uppercase">
					Watch — {watching} / {game.sequence.length}
				</span>
			{:else if phase === "playing"}
				<Hand class="w-4 h-4 text-primary" />
				<span class="text-foreground text-sm tracking-widest uppercase">
					Repeat — {userSequence.length} / {game.sequence.length}
				</span>
			{:else if phase === "submitting"}
				<Loader2 class="w-4 h-4 text-muted-foreground animate-spin" />
				<span class="text-muted-foreground text-sm tracking-widest uppercase">Checking…</span>
			{/if}
		</div>

		<!-- Sequence progress pips -->
		<div class="flex flex-wrap justify-center gap-1 mt-1 max-w-xs">
			{#each { length: game.sequence.length } as _, i}
				<div class={cn(
					"h-0.5 w-4 rounded-full transition-colors duration-200",
					phase === "watching" && i < watching
						? "bg-amber-500"
						: phase === "playing" && i < userSequence.length
							? "bg-primary"
							: "bg-border",
				)}></div>
			{/each}
		</div>
	</div>

	<!-- Error banner -->
	{#if error}
		<div class="flex items-center gap-2 px-4 py-2 rounded-md border border-destructive/40 bg-destructive/10 text-destructive text-xs tracking-wide">
			<TriangleAlert class="w-3.5 h-3.5 shrink-0" />
			{error}
		</div>
	{/if}

	<!-- Grid -->
	<div
		class="grid gap-2"
		style="
			grid-template-columns: repeat({game.size}, 4rem);
			grid-template-rows:    repeat({game.size}, 4rem);
		"
	>
		{#each { length: totalCells } as _, cellIndex}
			{@const order = userSequence.indexOf(cellIndex) + 1}
			{@const isActive = active === cellIndex}
			{@const isSelected = order > 0}
			{@const isClickable = phase === "playing" && !isSelected && !isSequenceComplete}

			<button
				onclick={() => onClick(cellIndex)}
				disabled={!isClickable}
				class={cn(
					"relative rounded-md border-2 text-xs font-bold",
					"flex items-center justify-center overflow-hidden",
					"transition-all duration-150",
					"bg-card border-border text-muted-foreground",
					isActive && [
						"bg-amber-500 border-amber-400 text-amber-950",
						"shadow-[0_0_18px_4px_theme(colors.amber.500/40%)] scale-105",
					],
					isSelected && !isActive && "bg-primary/15 border-primary text-primary",
					isClickable && "cursor-pointer hover:bg-accent hover:border-ring hover:scale-105",
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

	<!-- Meta strip -->
	<div class="flex gap-6 text-[10px] text-muted-foreground/50 tracking-widest uppercase">
		<span>Grid {game.size}×{game.size}</span>
		<span>Seq {game.sequence.length}</span>
		<span>Diff {Math.round(game.difficulty * 100)}%</span>
	</div>

	<!-- Actions -->
	<div class="flex gap-3">
		{#if phase === "playing"}
			{#if userSequence.length > 0}
				<Button
					variant="ghost"
					onclick={reset}
					class="gap-2 tracking-widest uppercase text-xs text-muted-foreground"
				>
					<RotateCcw class="w-3.5 h-3.5" />
					Reset
				</Button>
			{/if}

			<Button
				variant="ghost"
				onclick={doWatch}
				class="gap-2 tracking-widest uppercase text-xs text-muted-foreground"
			>
				<Eye class="w-3.5 h-3.5" />
				Replay
			</Button>

			<Button
				onclick={() => onSubmit()}
				disabled={!isSequenceComplete}
				class="gap-2 tracking-widest uppercase text-xs"
			>
				<CheckCheck class="w-3.5 h-3.5" />
				Submit
			</Button>
		{:else if phase === "submitting"}
			<Button disabled class="gap-2 tracking-widest uppercase text-xs opacity-50">
				<Loader2 class="w-3.5 h-3.5 animate-spin" />
				Verifying…
			</Button>
		{/if}
	</div>
{/snippet}

<!-- ── Finish ─────────────────────────────────────────────────────────────────-->
{#snippet finish()}
	<div class="flex flex-col items-center gap-8 max-w-sm text-center">
		<!-- Celebratory icon -->
		<div class="relative">
			<div class="rounded-full bg-primary/10 border border-primary/20 p-6 animate-bounce" style="animation-duration: 1.5s">
				<PartyPopper class="w-12 h-12 text-primary" />
			</div>
			<!-- Confetti dots -->
			{#each [
				"top-0 -right-3 bg-amber-500",
				"-top-2 left-2 bg-primary",
				"top-4 -left-4 bg-destructive",
				"-bottom-1 right-3 bg-amber-400",
				"bottom-2 -left-2 bg-primary/60",
			] as pos}
				<span class={cn("absolute w-2 h-2 rounded-full animate-ping", pos)} style="animation-duration:1.2s; animation-delay:{Math.random() * 0.5}s"></span>
			{/each}
		</div>

		<div class="flex flex-col gap-2">
			<h1 class="text-xl font-semibold tracking-tight text-foreground">
				Challenge Complete!
			</h1>
			<p class="text-sm text-muted-foreground leading-relaxed">
				You've successfully completed all memory stages. Well done — your
				memory is something else.
			</p>
		</div>

		<Button onclick={() => goto("/home")} class="gap-2 w-full tracking-widest uppercase text-xs">
			<House class="w-3.5 h-3.5" />
			Back to Home
		</Button>
	</div>
{/snippet}

<!-- ═══════════════════════════════════════════════════════════════════════════
     ROOT LAYOUT
     ═══════════════════════════════════════════════════════════════════════════ -->
<div class="min-h-screen bg-background flex flex-col items-center justify-center gap-8 p-6 font-mono select-none">

	<!-- Timer bar: only visible once the event has started and not on intro/finish -->
	{#if startedAt !== null && phase !== "finished"}
		{@render timerBar()}
	{/if}

	<!-- View switcher -->
	{#if phase === "intro"}
		{@render intro()}
	{:else if phase === "finished"}
		{@render finish()}
	{:else}
		{@render gameView()}
	{/if}
</div>
