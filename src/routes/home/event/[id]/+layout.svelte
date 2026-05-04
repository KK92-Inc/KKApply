<script lang="ts">
	import { page } from "$app/state";
	import * as Event from "$lib/remotes/event.remote";
	import * as Page from "./index.svelte";
	import type { LayoutProps } from "./$types";

	const { children, params }: LayoutProps = $props();
	const context = Page.set({
		get event() {
			return Event.get(params.id);
		},
		get userEvent() {
			return Event.getUserEvent({
				eventId: params.id,
				userId: page.data.session.userId,
			});
		},
	});
</script>

<svelte:boundary>
	{#snippet pending()}<p>Loading…</p>{/snippet}
	{#snippet failed(e, reset)}
	{JSON.stringify(e)}
		<button onclick={reset}>Retry</button>
	{/snippet}
	{@render children?.()}
</svelte:boundary>
