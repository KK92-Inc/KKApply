<script lang="ts">
	import type { PageProps } from "./$types";
	import * as Page from "./index.svelte";
	import * as Event from "$lib/remotes/event.remote";
	import type { Component } from "svelte";
	import Memory from "./stages/memory.svelte";
	import Rocket from "./stages/rocket.svelte";

	const context = Page.get();
	const event = await context.event;
	const stages: Record<string, Component> = {
		"memory": Memory,
		"coding": Rocket,
	};

	const Stage = stages[event.eventTypeId];
</script>

{#if Stage}
	<Stage />
{:else}
	<div class="w-dvw h-full flex items-center justify-center">
		<p class="text-xl">Unknown event type: {event.eventTypeId}</p>
	</div>
{/if}
