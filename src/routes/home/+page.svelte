<script>
	import { PartyPopper } from "@lucide/svelte";

</script>
<div class="container mx-auto max-w-3xl">
	<div class="space-y-8 pt-4">
		<div
			class="mb-6 flex flex-col gap-2 rounded-xl border border-border bg-card px-8 py-7 shadow-lg"
		>
			<h1 class="font-sans text-3xl font-extrabold tracking-tight text-primary">
				Welcome to NXTApply!
			</h1>
			<p class="mt-1 text-lg text-muted-foreground">
				Your student application journey starts here.<br />
				<span class="text-base">Follow the steps below to complete your application.</span>
			</p>
		</div>

		<!-- Events List -->
		<div class="rounded-xl border border-border bg-card px-6 py-6 shadow-md">
			<div class="mb-5 flex items-center gap-2">
				<PartyPopper size={22} class="text-primary" />
				<h2 class="text-xl font-semibold tracking-tight">Upcoming Events</h2>
			</div>
			<ul class="divide-y divide-border">
				<!-- {#each data.events as event, i}
					<Event {event} />
				{/each} -->
				{#if [].length === 0}
					<li class="py-8 text-center text-base text-muted-foreground">No upcoming events.</li>
				{/if}
			</ul>
		</div>
	</div>
</div>
