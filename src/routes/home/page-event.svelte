<script lang="ts">
	import { DateFormatter, fromDate, now } from "@internationalized/date";
	import * as Item from "$lib/components/item";
	import * as Alert from "$lib/components/alert";
	import {
		Calendar,
		MapPin,
		ExternalLink,
		CircleAlert,
		LockKeyhole,
		Clock,
		Users,
		LogOut,
		Loader,
		CircleCheck,
		LockKeyholeOpen,
		CirclePlay,
		Play,
	} from "@lucide/svelte";
	import type { EventWithUserInfo } from "$lib/remotes/event.remote";
	import { Button, buttonVariants } from "$lib/components/button";
	import { page } from "$app/state";
	import { cn, ensure } from "$lib/utils";
	import { Badge } from "$lib/components/badge";
	import * as Tooltip from "$lib/components/tooltip";
	import * as AlertDialog from "$lib/components/alert-dialog";
	import * as Event from "$lib/remotes/event.remote";
	import { isHttpError } from "@sveltejs/kit";
	import { toast } from "svelte-sonner";

	interface Props {
		event: EventWithUserInfo;
	}

	const { event }: Props = $props();
	const formatter = new DateFormatter(page.data.locale, {
		year: "numeric",
		month: "short",
		day: "numeric",
		hour: "2-digit",
		minute: "2-digit",
		hour12: false,
	});

	const dateify = (date: string | null) => (date ? new Date(date) : null);

	let loading = $state(false);
	const starts = $derived(dateify(event.startsAt));
	const until = $derived(dateify(event.registerUntil));
	const completed = $derived(dateify(event.completedAt));

	const challenge = $derived(
		event.eventTypeId === "coding" || event.eventTypeId === "memory",
	);
	const expired = $derived(
		starts
			? now(page.data.tz).compare(fromDate(starts, page.data.tz)) > 0
			: false,
	);
	const cutoff = $derived(
		until
			? now(page.data.tz).compare(fromDate(until, page.data.tz)) > 0
			: false,
	);

	async function register(eventId: string) {
		console.log("Registering for event", eventId);
		loading = true;
		const [result, error] = await ensure(
			Event.register({
				userId: page.data.session.userId,
				eventId,
			}),
		);

		if (error && isHttpError(error)) {
			toast.error(error.body.message);
		}

		loading = false;
	}

	async function unregister(eventId: string) {
		console.log("Unregistering from event", eventId);
		loading = true;
		const [result, error] = await ensure(
			Event.unregister({
				userId: page.data.session.userId,
				eventId,
			}),
		);

		if (error && isHttpError(error)) {
			toast.error(error.body.message);
		}
		loading = false;
	}
</script>

{#snippet calendar()}
	{#if starts}
		<Button
			href="#"
			variant="link"
			download={`${event.name}.ics`}
			class={cn(
				"self-start p-0",
				expired && "pointer-events-none line-through",
			)}
			title="Save to calendar"
		>
			<Calendar class="size-3.5" />
			{formatter.format(starts)}
		</Button>
	{/if}
{/snippet}

{#snippet registerBy()}
	{#if until && !completed && !expired && !cutoff}
		<span
			class="inline-flex items-center gap-1 text-amber-600 dark:text-amber-400"
		>
			<Clock class="size-3.5" />
			Register by {formatter.format(until)}
		</span>
	{/if}
{/snippet}

{#snippet address()}
	{#if event.address}
		<Button
			href={`https://maps.apple.com/?q=${encodeURIComponent(event.address)}`}
			target="_blank"
			variant="link"
			rel="noopener noreferrer"
			class="inline-flex items-center gap-1 transition-colors hover:text-foreground self-start p-0"
		>
			<MapPin class="size-3.5" />
			{event.address}
			<ExternalLink class="size-3" />
		</Button>
	{/if}
{/snippet}

{#snippet require()}
	{#if event.requires}
		<Alert.Root variant="destructive" class="w-fit">
			<CircleAlert class="size-3.5 shrink-0" />
			<Alert.Title
				>Requires completing
				<span class="font-semibold">{event.requires}</span> first.
			</Alert.Title>
		</Alert.Root>
	{/if}
{/snippet}

{#snippet spots()}
	{#if event.maxUsers}
		<span class="inline-flex items-center gap-1">
			<Users class="size-3.5" />
			{event.maxUsers} spots
		</span>
	{/if}
{/snippet}

{#snippet deregister()}
	<AlertDialog.Root>
		<AlertDialog.Trigger>
			{#snippet child({ props })}
				<Button {...props} variant="destructive" size="sm">Unsubscribe</Button>
			{/snippet}
		</AlertDialog.Trigger>
		<AlertDialog.Content>
			<AlertDialog.Header>
				<AlertDialog.Title>
					Unregister from {event.name}?
				</AlertDialog.Title>
				<AlertDialog.Description>
					You'll lose your spot and may not be able to re-register if the event
					fills up.
				</AlertDialog.Description>
			</AlertDialog.Header>
			<AlertDialog.Footer>
				<AlertDialog.Cancel disabled={loading}>Keep my spot</AlertDialog.Cancel>
				<AlertDialog.Action
					class={buttonVariants({ variant: "destructive" })}
					disabled={loading}
					onclick={() => unregister(event.id)}
				>
					{#if loading}
						<Loader class="size-4 animate-spin" />
						Please wait...
					{:else}
						Yes, Unsubscribe
					{/if}
				</AlertDialog.Action>
			</AlertDialog.Footer>
		</AlertDialog.Content>
	</AlertDialog.Root>
{/snippet}

<Item.Root variant="outline" class="rounded-none! border-0 not-last:border-b">
	{#snippet child({ props })}
		<div {...props}>
			<Item.Media
				variant="icon"
				class={cn(`
				self-center! border-primary bg-primary/10 text-primary
				shrink-0 sm:self-center rounded-full p-2 border-2 size-10
				${completed && "border-emerald-500 bg-emerald-500 text-white"}
				${expired || (event.requires && "border-border bg-muted text-muted-foreground")}
			`)}
			>
				{#if completed}
					<CircleCheck class="size-8" />
				{:else if event.requires}
					<LockKeyhole class="size-8" />
				{:else}
					<LockKeyholeOpen class="size-8" />
				{/if}
			</Item.Media>
			<Item.Content class="gap-0">
				<Item.Title class="flex items-center gap-2 text-muted-foreground">
					<span class="text-[0.875rem] text-primary font-medium leading-snug">
						{event.name}
					</span>
					{@render spots()}
					{@render registerBy()}
				</Item.Title>
				<Item.Description>{event.description}</Item.Description>
				<div class="flex items-center gap-2 text-xs text-muted-foreground">
					{@render calendar()}
					{@render address()}
				</div>
				{@render require()}
			</Item.Content>
			<Item.Content class="flex-none text-center">
				{#if event.userEventId}
					<div class="flex items-center gap-1">
						{#if !completed}
						{@render deregister()}
						{/if}
						{#if event.eventTypeId === "coding" || event.eventTypeId === "memory" && !completed}
							<Button
								variant="outline"
								class="p-0 text-muted-foreground hover:text-emerald-500"
								href={`/home/event/${event.id}`}
								size="icon-sm"
							>
								<Play class="size-4" />
							</Button>
						{/if}
					</div>
				{:else if !completed && !expired && !cutoff}
					<Button
						{loading}
						onclick={() => register(event.id)}
						disabled={expired || !!completed || cutoff || !!event.requires}
						variant="outline"
						size="sm"
					>
						Subscribe
					</Button>
				{/if}
			</Item.Content>
		</div>
	{/snippet}
</Item.Root>
