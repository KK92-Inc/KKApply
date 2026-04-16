<script lang="ts">
	import { AreaChart } from "layerchart";
	import * as Chart from "$lib/components/chart";

	const chartData = [
		{ date: new Date("2024-01-01"), desktop: 186 },
		{ date: new Date("2024-02-01"), desktop: 305 },
		{ date: new Date("2024-03-01"), desktop: 237 },
		{ date: new Date("2024-04-01"), desktop: 73 },
		{ date: new Date("2024-05-01"), desktop: 209 },
		{ date: new Date("2024-06-01"), desktop: 214 },
	];

	const chartConfig = {
		desktop: { label: "Desktop", color: "var(--chart-1)" },
	} satisfies Chart.ChartConfig;
</script>

<Chart.Container config={chartConfig}>
	<AreaChart
		data={chartData}
		x="date"
		series={[
			{
				key: "desktop",
				label: "Desktop",
				color: chartConfig.desktop.color,
			},
		]}
		axis="x"
		props={{
			area: {
				fillOpacity: 0.4,
				line: { class: "stroke-1" },
				motion: "tween",
			},
			xAxis: {
				format: (v: Date) => v.toLocaleDateString("en-US", { month: "short" }),
			},
		}}
	>
		{#snippet tooltip()}
			<Chart.Tooltip
				labelFormatter={(v: Date) =>
					v.toLocaleDateString("en-US", { month: "long" })}
				indicator="line"
			/>
		{/snippet}
	</AreaChart>
</Chart.Container>
