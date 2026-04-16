<script lang="ts">
	import * as Date from "@internationalized/date";
	import type { PageProps } from "./$types";

	const { data }: PageProps = $props();

	/**
	 * For challenges it's basically:
	 *
	 * When userEvent is registered + 2 hours to complete
	 */
	const timeLeft = $derived(Date.parseAbsoluteToLocal(data.userEvent.createdAt).add({ hours: 2 }));
</script>

<h1>
	{#if timeLeft.hour > 0}
		Time left: {Math.floor(timeLeft.hour/ 1000 / 60)} minutes
	{:else}
		Time's up!
	{/if}
</h1>
