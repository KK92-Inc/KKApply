<script lang="ts">
	import { PartyPopper, CalendarX2 } from "@lucide/svelte";
	import * as Card from "$lib/components//card";
	import * as Event from "$lib/remotes/event.remote";
	import * as Item from "$lib/components/item";
	import { Separator } from "$lib/components//separator";
	import PageEvent from "./page-event.svelte";
	import { toast } from "svelte-sonner";
	import { ensure } from "$lib/utils.js";
	import { isHttpError } from "@sveltejs/kit";

	let { data } = $props();

	const missed = $derived(Event.missed(data.session.userId));
	const events = $derived(Event.registered(data.session.userId));

	async function register(eventId: string) {
		console.log("Registering for event", eventId);
		const [result, error] = await ensure(
			Event.register({
				userId: data.session.userId,
				eventId,
			}),
		);

		if (error && isHttpError(error)) {
			toast.error(error.body.message);
		}
	}

	async function unregister(eventId: string) {
		console.log("Unregistering from event", eventId);
		const [result, error] = await ensure(
			Event.unregister({
				userId: data.session.userId,
				eventId,
			}),
		);

		if (error && isHttpError(error)) {
			toast.error(error.body.message);
		}
	}
</script>

<div class="mx-auto max-w-2xl space-y-6 px-4 py-10">
	<!-- Welcome Banner -->
	<Card.Root
		class="border-none bg-linear-to-br from-primary/10 via-card to-card shadow-sm"
	>
		<Card.Header class="pb-2">
			<Card.Title class="text-2xl font-extrabold tracking-tight">
				Welcome to Apply! 🎓
			</Card.Title>
			<Card.Description class="text-base">
				Your student application journey starts here. Complete the steps below
				in order to finish your application.
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
			<Card.Description>
				Events may have prerequisites, complete them in order.
			</Card.Description>
		</Card.Header>
		<Separator />
		<Card.Content class="p-0">
			<svelte:boundary>
				{@const resolved = await events}
				{#snippet pending()}
					<div class="flex items-center justify-center py-16">
						<p class="text-sm text-muted-foreground">Loading events…</p>
					</div>
				{/snippet}

				<Item.Group class="gap-0">
					{#each resolved as event (event.id)}
						<PageEvent {event} />
					{:else}
						<Item.Root>
							<Item.Content
								class="grid place-items-center gap-2 py-16 text-center"
							>
								<Item.Title>No upcoming events at the moment.</Item.Title>
								<Item.Description>
									<p class="text-xs text-muted-foreground/60">
										Check back soon.
									</p>
								</Item.Description>
							</Item.Content>
						</Item.Root>
					{/each}
				</Item.Group>
			</svelte:boundary>
		</Card.Content>
	</Card.Root>

	<!-- Missed events (registered, didn't complete, window passed) -->
	<!-- <svelte:boundary>
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
	</svelte:boundary> -->
</div>
