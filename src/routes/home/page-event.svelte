<script lang="ts">
	import { DateFormatter, fromDate, now } from '@internationalized/date';
	import type { EventWithUserInfo } from '$lib/remotes/user.remote';
	import * as User from '$lib/remotes/user.remote';
	import { page } from '$app/state';
	import {
		BadgeCheck,
		BadgeX,
		Calendar,
		MapPin,
		ExternalLink,
		CircleAlert,
		Lock,
		Clock,
		Circle,
		Users,
		LogOut,
		Loader,

		CircleCheck


	} from '@lucide/svelte';
	import { cn } from '$lib/utils';
	import { Button } from '$lib/components/button';
	import { Badge } from '$lib/components/badge';
	import * as Tooltip from '$lib/components/tooltip';
	import * as AlertDialog from '$lib/components/alert-dialog';
	import { buttonVariants } from '$lib/components/button';
	import { isHttpError } from '@sveltejs/kit';

	interface Props {
		event: EventWithUserInfo;
		index: number;
		total: number;
	}

	const { event, index, total }: Props = $props();
	const formatter = new DateFormatter(page.data.locale, {
		year: 'numeric',
		month: 'short',
		day: 'numeric',
		hour: '2-digit',
		minute: '2-digit',
		hour12: false
	});

	const starts = $derived(event.startsAt ? new Date(event.startsAt) : null);
	const registerUntil = $derived(event.registerUntil ? new Date(event.registerUntil) : null);
	const completedAt = $derived(event.completedAt ? new Date(event.completedAt) : null);

	const expired = $derived(starts ? now(page.data.tz).compare(fromDate(starts, page.data.tz)) > 0 : false);
	const isCutoff = $derived(
		registerUntil ? now(page.data.tz).compare(fromDate(registerUntil, page.data.tz)) > 0 : false
	);
	const isLocked = $derived(!!event.requires);

	// Can the user unregister? Only if registered and event hasn't started yet
	const canUnregister = $derived(!!event.userEventId && !completedAt && !expired);
	const disabled = $derived(expired || !!completedAt || isCutoff || isLocked);
	const status = $derived.by(() => {
		if (completedAt) return 'completed';
		if (isLocked) return 'locked';
		if (expired) return 'expired';
		if (isCutoff) return 'cutoff';
		if (event.userEventId) return 'registered';
		return 'open';
	});

	const statusConfig = {
		completed: {
			label: 'Completed',
			icon: BadgeCheck,
			class: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20 dark:text-emerald-400'
		},
		registered: {
			label: 'Registered',
			icon: Clock,
			class: 'bg-blue-500/10 text-blue-600 border-blue-500/20 dark:text-blue-400'
		},
		locked: {
			label: 'Locked',
			icon: Lock,
			class: 'bg-muted text-muted-foreground border-border'
		},
		expired: {
			label: 'Expired',
			icon: BadgeX,
			class: 'bg-muted text-muted-foreground border-border'
		},
		cutoff: {
			label: 'Registration Closed',
			icon: BadgeX,
			class: 'bg-amber-500/10 text-amber-600 border-amber-500/20 dark:text-amber-400'
		},
		open: {
			label: 'Open',
			icon: Circle,
			class: 'bg-muted text-muted-foreground border-border'
		}
	} as const;

	const cfg = $derived(statusConfig[status]);

	// ── Mutations ────────────────────────────────────────────────────────────

	let pending = $state(false);
	let actionError = $state<string | null>(null);

	async function handleRegister() {
		if (pending) return;
		pending = true;
		actionError = null;
		try {
			await User.register(event.id);
		} catch (e: unknown) {
			if (isHttpError(e) && e.status === 422) {
				actionError = e.body.message;
				return;
			}

			actionError = 'Something went wrong. Please try again.';
		} finally {
			pending = false;
		}
	}

	async function handleUnregister() {
		if (pending) return;
		pending = true;
		actionError = null;
		try {
			await User.unregister(event.id);
		} catch (e: unknown) {
			actionError = e instanceof Error ? e.message : 'Something went wrong. Please try again.';
		} finally {
			pending = false;
		}
	}
</script>

<li
	class="group relative flex flex-col gap-4 px-5 py-5 transition-colors hover:bg-muted/30 sm:flex-row sm:items-start"
>
	<!-- Step indicator + connector line -->
	<div class="flex shrink-0 flex-col items-center gap-1 sm:pt-0.5">
		<div
			class={cn(
				'flex size-9 items-center justify-center rounded-full border-2 text-sm font-bold transition-colors',
				status === 'completed'
					? 'border-emerald-500 bg-emerald-500 text-white'
					: status === 'locked' || status === 'expired'
						? 'border-border bg-muted text-muted-foreground'
						: 'border-primary bg-primary/10 text-primary'
			)}
		>
			{#if status === 'completed'}
				<CircleCheck class="size-5" strokeWidth={2.5} />
			{:else if status === 'locked'}
				<Lock class="size-4" strokeWidth={2} />
			{:else}
				{index + 1}
			{/if}
		</div>
		{#if index < total - 1}
			<div class="mt-1 w-px grow bg-border"></div>
		{/if}
	</div>

	<!-- Content -->
	<div class="min-w-0 flex-1 space-y-2">
		<!-- Name + badges -->
		<div class="flex flex-wrap items-center gap-2">
			<p
				class={cn(
					'text-base font-semibold leading-tight',
					(expired || status === 'locked') && 'text-muted-foreground'
				)}
			>
				{event.name}
			</p>
			<Badge
				variant="outline"
				class={cn('h-5 gap-1 rounded-full px-2 text-[11px] font-medium', cfg.class)}
			>
				<cfg.icon class="size-3" strokeWidth={2} />
				{cfg.label}
			</Badge>
			{#if event.totalOptions && event.totalOptions > 1 && !event.userEventId}
				<Badge variant="secondary" class="h-5 rounded-full px-2 text-[11px]">
					{event.totalOptions} dates available
				</Badge>
			{/if}
		</div>

		<!-- Description -->
		{#if event.description}
			<p class="text-xs leading-relaxed text-muted-foreground">{event.description}</p>
		{/if}

		<!-- Meta row -->
		<div class="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
			{#if starts}
				<a
					href="#"
					download={`${event.name}.ics`}
					class={cn(
						'inline-flex items-center gap-1 transition-colors hover:text-foreground',
						expired && 'pointer-events-none line-through'
					)}
					title="Save to calendar"
				>
					<Calendar class="size-3.5" />
					{formatter.format(starts)}
				</a>
			{/if}

			{#if registerUntil && !completedAt && !expired && !isCutoff}
				{#if starts}
					<span class="text-muted-foreground/40">·</span>
				{/if}
				<span class="inline-flex items-center gap-1 text-amber-600 dark:text-amber-400">
					<Clock class="size-3.5" />
					Register by {formatter.format(registerUntil)}
				</span>
			{/if}

			{#if event.maxUsers}
				{#if starts || (registerUntil && !completedAt && !expired && !isCutoff)}
					<span class="text-muted-foreground/40">·</span>
				{/if}
				<span class="inline-flex items-center gap-1">
					<Users class="size-3.5" />
					{event.maxUsers} spots
				</span>
			{/if}

			{#if event.address}
				{#if starts || (registerUntil && !completedAt && !expired && !isCutoff) || event.maxUsers}
					<span class="text-muted-foreground/40">·</span>
				{/if}
				<a
					href={`https://maps.apple.com/?q=${encodeURIComponent(event.address)}`}
					target="_blank"
					rel="noopener noreferrer"
					class="inline-flex items-center gap-1 transition-colors hover:text-foreground"
				>
					<MapPin class="size-3.5" />
					{event.address}
					<ExternalLink class="size-3" />
				</a>
			{/if}
		</div>

		<!-- Prerequisite warning -->
		{#if isLocked && event.requires}
			<div
				class="flex items-start gap-1.5 rounded-lg border border-amber-500/20 bg-amber-500/5 px-3 py-2 text-xs text-amber-700 dark:text-amber-400"
			>
				<CircleAlert class="mt-0.5 size-3.5 shrink-0" />
				<span>
					Requires completing
					<span class="font-semibold">{event.requires}</span>
					first.
				</span>
			</div>
		{/if}

		<!-- Action error -->
		{#if actionError}
			<div
				class="flex items-start gap-1.5 rounded-lg border border-destructive/20 bg-destructive/5 px-3 py-2 text-xs text-destructive"
			>
				<CircleAlert class="mt-0.5 size-3.5 shrink-0" />
				{actionError}
			</div>
		{/if}

		<!-- Completed timestamp -->
		{#if completedAt}
			<p class="flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-400">
				<CircleCheck class="size-3.5" />
				Completed on {formatter.format(completedAt)}
			</p>
		{/if}
	</div>

	<!-- Actions -->
	{#if !completedAt}
		<div class="flex shrink-0 items-center gap-2 sm:self-start sm:pt-0.5">
			<!-- Unregister (only when registered and event hasn't started) -->
			{#if canUnregister}
				<AlertDialog.Root>
					<AlertDialog.Trigger>
						{#snippet child({ props })}
							<Button
								{...props}
								type="button"
								size="sm"
								variant="ghost"
								class="size-8 p-0 text-muted-foreground hover:text-destructive"
								disabled={pending}
								title="Unregister"
							>
								<LogOut class="size-4" />
							</Button>
						{/snippet}
					</AlertDialog.Trigger>
					<AlertDialog.Content>
						<AlertDialog.Header>
							<AlertDialog.Title>Unregister from {event.name}?</AlertDialog.Title>
							<AlertDialog.Description>
								You'll lose your spot and may not be able to re-register if the event fills up.
							</AlertDialog.Description>
						</AlertDialog.Header>
						<AlertDialog.Footer>
							<AlertDialog.Cancel>Keep my spot</AlertDialog.Cancel>
							<AlertDialog.Action
								class={buttonVariants({ variant: 'destructive' })}
								onclick={handleUnregister}
							>
								Yes, unregister
							</AlertDialog.Action>
						</AlertDialog.Footer>
					</AlertDialog.Content>
				</AlertDialog.Root>
			{/if}

			<!-- Register / status button -->
			<Tooltip.Root>
				<Tooltip.Trigger>
					{#snippet child({ props })}
						<Button
							{...props}
							type="button"
							size="sm"
							variant={status === 'registered' ? 'secondary' : 'default'}
							disabled={disabled || pending}
							class="min-w-24 gap-1.5"
							onclick={status === 'open' ? handleRegister : undefined}
						>
							{#if pending}
								<Loader class="size-3.5 animate-spin" />
							{:else if status === 'locked'}
								Locked
							{:else if status === 'cutoff' || status === 'expired'}
								Closed
							{:else if status === 'registered'}
								Registered
							{:else}
								Register
							{/if}
						</Button>
					{/snippet}
				</Tooltip.Trigger>
				{#if isLocked}
					<Tooltip.Content>
						<p>Complete <span class="font-medium">{event.requires}</span> first</p>
					</Tooltip.Content>
				{:else if isCutoff}
					<Tooltip.Content><p>Registration deadline has passed</p></Tooltip.Content>
				{:else if expired}
					<Tooltip.Content><p>This event has already started</p></Tooltip.Content>
				{:else if status === 'registered'}
					<Tooltip.Content><p>You're registered — click the arrow to unregister</p></Tooltip.Content>
				{/if}
			</Tooltip.Root>
		</div>
	{/if}
</li>
