<script lang="ts">
	import * as AlertDialog from '$lib/components/alert-dialog';
	import * as Card from '$lib/components/card';
	import { Button, buttonVariants } from '$lib/components/button';
	import { Badge } from '$lib/components/badge';
	import { Separator } from '$lib/components/separator';
	import {
		Mail,
		FingerprintPattern,
		Activity,
		Download,
		Trash2,
		UserRound,
		ShieldCheck,
		Eye,
		PenLine,
		Ban
	} from '@lucide/svelte';

	const dataCategories = [
		{
			icon: Mail,
			label: 'Contact Info',
			description: 'Your email address, used for login and notifications.'
		},
		{
			icon: FingerprintPattern,
			label: 'Identifiers',
			description: 'A unique user ID, verification token, and session IDs.'
		},
		{
			icon: Activity,
			label: 'Usage Data',
			description: 'Your IP address, stored per session to secure your account.'
		}
	] as const;

	const rights = [
		{
			icon: Eye,
			title: 'Right to Access',
			description: 'Request a full export of all personal data we hold about you.'
		},
		{
			icon: Trash2,
			title: 'Right to Erasure',
			description: 'Request permanent deletion of your data from all our systems.'
		},
		{
			icon: PenLine,
			title: 'Right to Rectification',
			description: 'Ask us to correct any incomplete or inaccurate data we hold.'
		},
		{
			icon: Ban,
			title: 'Right to Restrict Processing',
			description: 'Limit how we use your data while a concern is being resolved.'
		}
	] as const;
</script>

<div class="mx-auto max-w-2xl px-4 py-10 space-y-6">
	<div class="rounded-3xl border bg-card overflow-hidden">
		<!-- Top: Icon + heading -->
		<div class="flex flex-col items-center text-center gap-2 pt-10 pb-8 px-8">
			<div class="size-16 rounded-full bg-primary flex items-center justify-center mb-1">
				<UserRound class="size-8 text-primary-foreground" strokeWidth={2} />
			</div>
			<h2 class="text-xl font-bold tracking-tight">Data Linked to You</h2>
			<p class="text-muted-foreground text-sm">
				The following minimal data is collected and linked to your identity.
			</p>
		</div>

		<Separator />

		<!-- 3-column data grid -->
		<div class="grid grid-cols-3 divide-x">
			{#each dataCategories as { icon: Icon, label, description }}
				<div class="flex flex-col items-center text-center gap-3 px-5 py-8">
					<Icon class="size-6 text-muted-foreground" strokeWidth={1.75} />
					<div class="space-y-1">
						<p class="text-sm font-semibold">{label}</p>
						<p class="text-muted-foreground text-xs leading-relaxed">{description}</p>
					</div>
				</div>
			{/each}
		</div>

		<Separator />

		<!-- Footer note -->
		<p class="text-center text-xs text-muted-foreground px-8 py-5">
			We <span class="font-semibold text-foreground">never</span> sell your data to third parties or
			track you across other sites and apps.
		</p>
	</div>

	<!-- What is GDPR -->
	<Card.Root>
		<Card.Header class="flex-row items-center gap-3 space-y-0 pb-3">
			<ShieldCheck class="size-5 text-primary shrink-0" strokeWidth={2} />
			<Card.Title class="text-base">What is GDPR?</Card.Title>
		</Card.Header>
		<Card.Content class="text-sm text-muted-foreground leading-relaxed space-y-2">
			<p>
				The <span class="font-semibold text-foreground">General Data Protection Regulation (GDPR)</span>
				is a European Union law that gives individuals meaningful control over their personal data. It
				requires companies to be transparent about what they collect, why, and for how long.
			</p>
			<p>
				These rights apply to all EU/EEA residents regardless of where the company processing
				their data is based.
			</p>
		</Card.Content>
	</Card.Root>

	<!-- Your Rights -->
	<Card.Root>
		<Card.Header class="pb-4">
			<Card.Title class="text-base">Your Rights Under GDPR</Card.Title>
			<Card.Description class="text-sm">
				You can exercise any of these rights by contacting us directly.
			</Card.Description>
		</Card.Header>
		<Card.Content class="grid grid-cols-1 sm:grid-cols-2 gap-3">
			{#each rights as { icon: Icon, title, description }}
				<div class="flex gap-3 rounded-xl border bg-muted/30 p-4">
					<Icon class="size-4 text-primary mt-0.5 shrink-0" strokeWidth={2} />
					<div class="space-y-1">
						<p class="text-sm font-semibold leading-none">{title}</p>
						<p class="text-xs text-muted-foreground leading-relaxed">{description}</p>
					</div>
				</div>
			{/each}
		</Card.Content>
	</Card.Root>

	<!-- Actions -->
	<Card.Root>
		<Card.Header class="pb-4">
			<Card.Title class="text-base">Take Control of Your Data</Card.Title>
			<Card.Description class="text-sm">
				Request a copy of your data, or permanently delete everything we hold on you.
			</Card.Description>
		</Card.Header>
		<Card.Content class="flex flex-col sm:flex-row gap-3">
			<Button variant="outline" class="flex-1 gap-2">
				<Download class="size-4" />
				Request Data Download
			</Button>

			<AlertDialog.Root>
				<AlertDialog.Trigger class="{buttonVariants({ variant: 'destructive' })} flex-1 gap-2">
					<Trash2 class="size-4" />
					Permanently Delete My Data
				</AlertDialog.Trigger>
				<AlertDialog.Content>
					<AlertDialog.Header>
						<AlertDialog.Title>Are you absolutely sure?</AlertDialog.Title>
						<AlertDialog.Description>
							This will permanently delete your account, all active sessions, and every piece
							of data we hold about you. This action <strong>cannot be undone</strong>.
						</AlertDialog.Description>
					</AlertDialog.Header>
					<AlertDialog.Footer>
						<AlertDialog.Cancel>Cancel</AlertDialog.Cancel>
						<AlertDialog.Action
							class={buttonVariants({ variant: 'destructive' })}
							onclick={() => { /* TODO: wire delete endpoint */ }}
						>
							Yes, delete everything
						</AlertDialog.Action>
					</AlertDialog.Footer>
				</AlertDialog.Content>
			</AlertDialog.Root>
		</Card.Content>
		<Card.Footer class="border-t pt-4">
			<p class="text-xs text-muted-foreground">
				Data requests are processed within 30 days as required by GDPR Article 12.
			</p>
		</Card.Footer>
	</Card.Root>

</div>
