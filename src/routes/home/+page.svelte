<script lang="ts">
	import { PartyPopper, CalendarX2 } from '@lucide/svelte';
	import * as Card from '$lib/components//card';
	import * as User from '$lib/remotes/user.remote';
	import { Separator } from '$lib/components//separator';
	import PageEvent from './page-event.svelte';

	let { data } = $props();

	const events = $derived(User.events(data.session.userId));
	const missed = $derived(User.missed(data.session.userId));
</script>

<div class="mx-auto max-w-2xl space-y-6 px-4 py-10">
	<!-- Welcome Banner -->
	<Card.Root class="border-none bg-linear-to-br from-primary/10 via-card to-card shadow-sm">
		<Card.Header class="pb-2">
			<Card.Title class="text-2xl font-extrabold tracking-tight">Welcome to Apply! 🎓</Card.Title>
			<Card.Description class="text-base">
				Your student application journey starts here. Complete the steps below in order to finish
				your application.
			</Card.Description>
		</Card.Header>
	</Card.Root>

	<!-- Upcoming / active events -->
	<Card.Root class="gap-0 pb-0">
		<Card.Header class="pb-3">
			<div class="flex items-center gap-2">
				<PartyPopper class="size-5 text-primary" />
				<Card.Title class="text-base font-semibold">Your Events</Card.Title>
			</div>
			<Card.Description>Events may have prerequisites — complete them in order.</Card.Description>
		</Card.Header>

		<Separator />

		<Card.Content class="p-0">
			<svelte:boundary>
				{#snippet pending()}
					<div class="flex items-center justify-center py-16">
						<p class="text-sm text-muted-foreground">Loading events…</p>
					</div>
				{/snippet}

				{@const resolvedEvents = await events}

				{#if resolvedEvents.length === 0}
					<div class="flex flex-col items-center justify-center gap-2 py-16 text-center">
						<PartyPopper class="size-8 text-muted-foreground/40" />
						<p class="text-sm text-muted-foreground">No upcoming events at the moment.</p>
						<p class="text-xs text-muted-foreground/60">Check back soon.</p>
					</div>
				{:else}
					<ul class="divide-y">
						{#each resolvedEvents as event, i}
							<PageEvent {event} index={i} total={resolvedEvents.length} />
						{/each}
					</ul>
				{/if}
			</svelte:boundary>
		</Card.Content>
	</Card.Root>

	<!-- Missed events (registered, didn't complete, window passed) -->
	<svelte:boundary>
		{@const resolvedMissed = await missed}

		{#if resolvedMissed.length > 0}
			<Card.Root class="gap-0 pb-0">
				<Card.Header class="pb-3">
					<div class="flex items-center gap-2">
						<CalendarX2 class="size-5 text-destructive" />
						<Card.Title class="text-base font-semibold">Missed Events</Card.Title>
					</div>
					<Card.Description>
						You were registered for these events but didn't complete them in time. Contact staff if
						you have questions.
					</Card.Description>
				</Card.Header>

				<Separator />

				<Card.Content class="p-0">
					<ul class="divide-y">
						{#each resolvedMissed as event}
							<li class="flex items-start gap-4 px-5 py-4">
								<div
									class="flex size-9 shrink-0 items-center justify-center rounded-full border-2 border-border bg-muted"
								>
									<CalendarX2 class="size-4 text-muted-foreground" />
								</div>
								<div class="min-w-0 flex-1 space-y-1">
									<p class="text-sm font-semibold text-muted-foreground">{event.name}</p>
									<p class="text-xs text-muted-foreground">{event.description}</p>
									<p class="text-xs text-muted-foreground/60">
										Was scheduled for {new Date(event.startsAt).toLocaleDateString()}
									</p>
								</div>
							</li>
						{/each}
					</ul>
				</Card.Content>
			</Card.Root>
		{/if}
	</svelte:boundary>
</div>
