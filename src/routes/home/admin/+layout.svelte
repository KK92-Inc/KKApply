<script lang="ts">
	import { page } from '$app/state';
	import { LayoutDashboard, Users, CalendarDays, ChevronRight } from '@lucide/svelte';
	import { cn } from '$lib/utils';

	let { children } = $props();

	const nav = [
		{ href: '/home/admin',        label: 'Dashboard',  icon: LayoutDashboard },
		{ href: '/home/admin/users',  label: 'Users',      icon: Users },
		{ href: '/home/admin/events', label: 'Events',     icon: CalendarDays },
	];
</script>

<div class="flex min-h-screen">
	<!-- Sidebar -->
	<aside class="hidden w-56 shrink-0 border-r bg-muted/30 md:flex md:flex-col">
		<div class="flex h-14 items-center border-b px-4">
			<span class="text-sm font-semibold tracking-tight">Admin</span>
		</div>
		<nav class="flex flex-col gap-0.5 p-2 pt-3">
			{#each nav as item}
				{@const active = page.url.pathname === item.href}
				<a
					href={item.href}
					class={cn(
						'flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-colors',
						active
							? 'bg-primary text-primary-foreground font-medium'
							: 'text-muted-foreground hover:bg-muted hover:text-foreground'
					)}
				>
					<item.icon class="size-4 shrink-0" />
					{item.label}
					{#if active}
						<ChevronRight class="ml-auto size-3.5 opacity-60" />
					{/if}
				</a>
			{/each}
		</nav>
	</aside>

	<!-- Main content -->
	<div class="min-w-0 flex-1 overflow-auto">
		{@render children()}
	</div>
</div>
