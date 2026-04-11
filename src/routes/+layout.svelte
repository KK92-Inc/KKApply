<script lang="ts">
	import './layout.css';
	import favicon from '$lib/assets/favicon.svg';
	import { ModeWatcher } from 'mode-watcher';
	import { Toaster } from '$lib/components/sonner';
	import TooltipProvider from '$lib/components/tooltip/tooltip-provider.svelte';

	let { children } = $props();
</script>

<svelte:head><link rel="icon" href={favicon} /></svelte:head>

<TooltipProvider />
<Toaster richColors closeButton/>
<ModeWatcher />
{@render children()}
