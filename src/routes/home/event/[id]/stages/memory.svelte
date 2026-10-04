<script lang="ts">
	import * as Page from "../index.svelte";
	import * as Memory from "./memory.remote";
	import * as IntlDate from "@internationalized/date";
	import * as Event from "$lib/remotes/event.remote";
	import { Button } from "$lib/components/button";
	import { cn } from "$lib/utils";

	type Phase = "intro" | "watching" | "playing" | "submitting" | "finished";

	// ── Bootstrap ──────────────────────────────────────────────────────────────

	const context = Page.get();
	let phase = $state<Phase>("playing");
	let active = $state<number | null>(null);
	let userSequence = $state<number[]>([]);
	let userEvent = $derived(await context.userEvent);
	let game = $derived(await Memory.current(userEvent.id));
	const fullSequence = $derived(userSequence.length === game.sequence.length);

	// ── Timer ─────────────────────────────────────────────────────────────────

	let timeLeft = $derived(format(userEvent.startedAt));
	export function format(startsAt: string | null, minutes: number = 30) {
		if (!startsAt) return "00:00:00";
		const endsAt = IntlDate.parseAbsolute(startsAt, "UTC").add({
			minutes,
		});

		const current = IntlDate.now("UTC");
		if (current.compare(endsAt) >= 0) {
			// Force submission, this will evaluate it on the backend.
			// If the time has run out, it will submit whatever the user has done so far
			// return Memory.submit({ userEventId: userEvent.id, sequence: [] });
			return "00:00:00";
		}

		// Calculate diff using underlying epoch milliseconds
		const diff = endsAt.toDate().getTime() - current.toDate().getTime();
		const total = Math.floor(diff / 1000);
		const h = Math.floor(total / 3600);
		const m = Math.floor((total % 3600) / 60);
		const s = total % 60;

		const pad = (n: number) => n.toString().padStart(2, "0");
		return `${pad(h)}:${pad(m)}:${pad(s)}`;
	}

	$effect(() => {
		const id = setInterval(() => {
			timeLeft = format(userEvent.startedAt);
		}, 1000);

		return () => clearInterval(id);
	});

	// ── Handles ───────────────────────────────────────────────────────────────
</script>

{#if !userEvent.startedAt}
	<div class="flex flex-col items-center gap-4">
		<h2 class="text-2xl font-bold">Memory Challenge</h2>
		<p class="text-center text-muted-foreground">
			You will be shown a grid of 16 cards for 30 seconds. Try to memorize the
			cards and their positions!
		</p>
		<Button
			onclick={() =>
				Event.start({ eventId: userEvent.eventId, userId: userEvent.userId })}
			disabled={!game}
		>
			Start Challenge
		</Button>
	</div>
{:else if game}
	<div class="flex flex-col items-center gap-4">
		<h2 class="text-2xl font-bold">Memory Challenge</h2>

		<div class="rounded-lg bg-secondary p-4 text-center">
			<p class="text-sm uppercase tracking-wider text-muted-foreground">
				Time Remaining
			</p>
			<p class="font-mono text-4xl font-bold tabular-nums">
				{timeLeft ?? "00:00:00"}
			</p>
		</div>

		<!-- Game board would go here -->
		<div class="mt-8 grid grid-cols-4 gap-2">
			<div
				class="grid gap-2"
				style="
					grid-template-columns: repeat({game.size}, 4rem);
					grid-template-rows:    repeat({game.size}, 4rem);
				"
			>
				{#each { length: game.size * game.size } as _, cellIndex}
					{@const order = userSequence.indexOf(cellIndex) + 1}
					{@const isActive = active === cellIndex}
					{@const isSelected = order > 0}
					{@const isClickable =
						phase === "playing" && !isSelected && !fullSequence}

					<Button
						variant="outline"
						onclick={() => active = cellIndex}
						disabled={!isClickable}
						class={cn(
							"size-16 border-2",
							isActive && [
								"bg-amber-500 border-amber-400 text-amber-950",
								"shadow-[0_0_18px_4px_--theme(--color-amber-500/40%)] scale-105",
							],
							isSelected &&
								!isActive &&
								"bg-primary/15 border-primary text-primary",
							isClickable &&
								"cursor-pointer hover:bg-accent hover:border-ring hover:scale-105",
							phase === "watching" && !isActive && "opacity-25",
							phase === "submitting" && "opacity-40 cursor-default",
						)}
					>
						<!-- {#if isSelected} -->
						<span class="text-[10px] tabular-nums leading-none"
							>{order} - {cellIndex}</span
						>
						<!-- {/if} -->
						{#if isActive}
							<span
								class="absolute inset-0 rounded-md bg-amber-400/30 animate-ping"
								style="animation-duration: 0.45s"
							></span>
						{/if}
					</Button>
				{/each}
			</div>
		</div>
	</div>
{:else}
	<div class="flex h-64 items-center justify-center">
		<p class="animate-pulse">Loading game...</p>
	</div>
{/if}
