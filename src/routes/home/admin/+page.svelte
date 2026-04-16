<script lang="ts">
	import * as Stats from "$lib/remotes/stats.remote";
	import * as Card from "$lib/components/card/index.js";
	import * as Chart from "$lib/components/chart/index.js";
	import { Badge } from "$lib/components/badge/index.js";
	import { Button } from "$lib/components/button/index.js";
	import { Separator } from "$lib/components/separator/index.js";
	import { BarChart, AreaChart } from "layerchart";
	import {
		Users,
		UserCheck,
		UserX,
		TrendingUp,
		Download,
		RefreshCw,
	} from "@lucide/svelte";
	import ChartDemo from "./chart-demo.svelte";
	import { cn } from "$lib/utils";

	// ── Data ──────────────────────────────────────────────────────────────────

	const [userStats, rawSignups, funnel, fillRates] = await Promise.all([
		Stats.getUserStats(),
		Stats.getDailySignups(),
		Stats.getFunnel(),
		Stats.getEventFillRates(),
	]);

	// ── Helpers ───────────────────────────────────────────────────────────────

	function exportCSV<T extends Record<string, unknown>>(
		rows: T[],
		filename: string,
	) {
		if (!rows.length) return;
		const headers = Object.keys(rows[0]);
		const csv = [
			headers.join(","),
			...rows.map((r) =>
				headers.map((h) => JSON.stringify(r[h] ?? "")).join(","),
			),
		].join("\n");
		const blob = new Blob([csv], { type: "text/csv" });
		const url = URL.createObjectURL(blob);
		const a = document.createElement("a");
		a.href = url;
		a.download = filename;
		a.click();
		URL.revokeObjectURL(url);
	}

	// ── Chart configs ─────────────────────────────────────────────────────────

	const signupConfig = {
		count: { label: "New users", color: "var(--chart-1)" },
	} satisfies Chart.ChartConfig;

	const funnelConfig = {
		registered: { label: "Registered", color: "var(--chart-1)" },
		completed: { label: "Completed", color: "var(--chart-2)" },
		missed: { label: "Missed", color: "var(--chart-5)" },
	} satisfies Chart.ChartConfig;
</script>

<div class="space-y-8 p-6">
	<div class="flex items-center justify-between">
		<div>
			<h1 class="text-2xl font-bold tracking-tight">Dashboard</h1>
			<p class="text-sm text-muted-foreground">Application pipeline overview</p>
		</div>
		<Button
			variant="outline"
			size="sm"
			class="gap-2"
			onclick={() => {
				// userStats.refresh();
				// rawSignups.refresh();
				// funnel.refresh();
				// fillRates.refresh();
			}}
		>
			<RefreshCw class="size-3.5" />
			Refresh
		</Button>
	</div>

	<svelte:boundary>
		{#snippet pending()}
			<div class="grid grid-cols-2 gap-4 lg:grid-cols-4">
				{#each Array(4) as _}
					<Card.Root class="animate-pulse ">
						<Card.Content class="h-24" />
					</Card.Root>
				{/each}
			</div>
		{/snippet}

		<div class="grid grid-cols-2 gap-4 lg:grid-cols-4">
			<Card.Root class="">
				<Card.Header class="pb-2">
					<Card.Description>Total Users</Card.Description>
					<Users class="size-4 text-muted-foreground" />
				</Card.Header>
				<Card.Content>
					<p class="text-3xl font-bold">{userStats.total.toLocaleString()}</p>
					<p class="mt-1 text-xs text-muted-foreground">
						+{userStats.newLast7Days} this week
					</p>
				</Card.Content>
			</Card.Root>

			<Card.Root class="">
				<Card.Header class="pb-2">
					<Card.Description>Verified</Card.Description>
					<UserCheck class="size-4 text-muted-foreground" />
				</Card.Header>
				<Card.Content>
					<p class="text-3xl font-bold">
						{userStats.verified.toLocaleString()}
					</p>
					<p class="mt-1 text-xs text-muted-foreground">
						{userStats.total > 0
							? ((userStats.verified / userStats.total) * 100).toFixed(1)
							: 0}% of total
					</p>
				</Card.Content>
			</Card.Root>

			<Card.Root class="">
				<Card.Header class="pb-2">
					<div class="flex items-center justify-between">
						<Card.Description>New (30 days)</Card.Description>
						<TrendingUp class="size-4 text-muted-foreground" />
					</div>
				</Card.Header>
				<Card.Content>
					<p class="text-3xl font-bold">
						{userStats.newLast30Days.toLocaleString()}
					</p>
					<p class="mt-1 text-xs text-muted-foreground">
						{userStats.newLast7Days} in last 7 days
					</p>
				</Card.Content>
			</Card.Root>

			<Card.Root class="">
				<Card.Header class="pb-2">
					<div class="flex items-center justify-between">
						<Card.Description>Banned</Card.Description>
						<UserX class="size-4 text-muted-foreground" />
					</div>
				</Card.Header>
				<Card.Content>
					<p class="text-3xl font-bold">
						{userStats.banned.toLocaleString()}
					</p>
					<p class="mt-1 text-xs text-muted-foreground">
						{userStats.total > 0
							? ((userStats.banned / userStats.total) * 100).toFixed(2)
							: 0}% of total
					</p>
				</Card.Content>
			</Card.Root>
		</div>
	</svelte:boundary>

	<div class="grid grid-cols-1 gap-6 lg:grid-cols-2">
		<Card.Root class="">
			<Card.Header class="flex flex-row items-start justify-between pb-2">
				<Card.Title class="text-base">New Signups</Card.Title>
				<Card.Description>Daily registrations — last 90 days</Card.Description>
			</Card.Header>
			<Separator />
			<Card.Content class="pt-4">
				<Chart.Container config={signupConfig}>
					<AreaChart
						data={rawSignups}
						x="date"
						series={[
							{ key: "count", label: "New users", color: "var(--chart-1)" },
						]}
						axis="x"
						props={{
							area: {
								fillOpacity: 0.15,
								line: { class: "stroke-1" },
								motion: "tween",
							},
							xAxis: {
								format: (v: string) =>
									new Date(v).toLocaleDateString("en-US", { day: "numeric" }),
							},
						}}
					></AreaChart>
				</Chart.Container>
			</Card.Content>
		</Card.Root>

		<Card.Root class="">
			<Card.Header class="flex flex-row items-start justify-between pb-2">
				<Card.Title class="text-base">New Signups</Card.Title>
				<Card.Description>Daily registrations — last 90 days</Card.Description>
			</Card.Header>
			<Separator />
			<Card.Content class="pt-4">
				<Chart.Container config={funnelConfig}>
					<BarChart
						data={funnel}
						x="eventTypeName"
						axis="x"
						seriesLayout="group"
						series={[
							{
								key: "registered",
								label: "Registered",
								color: "var(--chart-1)",
							},
							{ key: "completed", label: "Completed", color: "var(--chart-2)" },
							{ key: "missed", label: "Missed", color: "var(--chart-5)" },
						]}
						props={{
							xAxis: { format: (v: string) => v.split(" ")[0] },
						}}
						legend
					>
						{#snippet tooltip()}
							<Chart.Tooltip />
						{/snippet}
					</BarChart>
				</Chart.Container>
			</Card.Content>
		</Card.Root>
	</div>

	<Card.Root class="">
		<Card.Header class="flex flex-row items-start justify-between pb-2">
			<Card.Title class="text-base">Event Capacity</Card.Title>
			<Card.Description>Fill rate per scheduled event</Card.Description>
		</Card.Header>
		<Separator />
		<Card.Content class="p-0">
			{#if fillRates.length === 0}
				<p class="py-10 text-center text-sm text-muted-foreground">
					No events with registrations yet.
				</p>
			{:else}
				<div class="overflow-x-auto">
					<table class="w-full text-sm">
						<thead>
							<tr
								class="border-b bg-muted/40 text-left text-xs text-muted-foreground"
							>
								<th class="px-4 py-2.5 font-medium">Type</th>
								<th class="px-4 py-2.5 font-medium">Date</th>
								<th class="px-4 py-2.5 text-right font-medium">Registered</th>
								<th class="px-4 py-2.5 text-right font-medium">Completed</th>
								<th class="px-4 py-2.5 text-right font-medium">Capacity</th>
								<th class="px-4 py-2.5 font-medium">Fill</th>
							</tr>
						</thead>
						<tbody class="divide-y">
							{#each fillRates as row}
								<tr class="transition-colors hover:bg-muted/30">
									<td class="px-4 py-3 font-medium">{row.eventTypeName}</td>
									<td class="px-4 py-3 text-muted-foreground">
										{row.startsAt
											? new Date(row.startsAt).toLocaleDateString()
											: "—"}
									</td>
									<td class="px-4 py-3 text-right tabular-nums"
										>{row.registered}</td
									>
									<td class="px-4 py-3 text-right tabular-nums"
										>{row.completed}</td
									>
									<td
										class="px-4 py-3 text-right tabular-nums text-muted-foreground"
									>
										{row.maxUsers ?? "∞"}
									</td>
									<td class="px-4 py-3">
										{#if row.fillPct !== null}
											<div class="flex items-center gap-2">
												<progress
													class={cn(
														"[&::-webkit-progress-bar]:rounded",
														"[&::-webkit-progress-value]:rounded",
														"[&::-webkit-progress-bar]:bg-muted",
														"[&::-webkit-progress-value]:bg-primary",
														"[&::-moz-progress-bar]:bg-primary",
													)}
													value={row.fillPct / 100}
												></progress>
												<span class="text-xs tabular-nums">{row.fillPct}%</span>
											</div>
										{:else}
											<Badge variant="secondary" class="text-[10px]"
												>No cap</Badge
											>
										{/if}
									</td>
								</tr>
							{/each}
						</tbody>
					</table>
				</div>
			{/if}
		</Card.Content>
	</Card.Root>
</div>
