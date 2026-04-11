<script lang="ts">
	import {
		UserCircle,
		ShieldCheck,
		HelpingHand,
		ShieldUser,
		Menu,
		Users,
		ChartArea,
		PartyPopper,
		Sun,
		Moon,
	} from "@lucide/svelte";
	import type { LayoutProps } from "./$types";
	import { PUBLIC_APP_NAME } from "$env/static/public";
	import * as DropdownMenu from "$lib/components/dropdown-menu";
	import { buttonVariants } from "$lib/components/button";
	import Button from "$lib/components/button/button.svelte";
	import Separator from "$lib/components/separator/separator.svelte";
	import * as Auth from "$lib/remotes/auth.remote";
	import { page } from "$app/state";
	import { isAdmin } from "$lib/remotes/user.remote";
	import { toggleMode } from "mode-watcher";

	const { children }: LayoutProps = $props();
	const admin = await isAdmin(page.data.session.userId);
</script>

<div class="flex min-h-screen flex-col bg-background">
	<header class="border-b bg-card shadow-sm">
		<div class="container mx-auto flex h-16 items-center justify-between px-4">
			<a class="flex items-center space-x-3" href="/home">
				<img src="/favicon.svg" alt="Logo" class="h-8 w-8" />
				<span class="text-lg font-semibold tracking-tight"
					>{PUBLIC_APP_NAME}</span
				>
			</a>

			<div class="flex items-center gap-1.5">
				<Button onclick={toggleMode} variant="outline" size="icon">
					<Sun class="dark:scale-0 dark:-rotate-90" />
					<Moon class="absolute scale-0 dark:scale-100 dark:rotate-0" />
					<span class="sr-only">Toggle theme</span>
				</Button>
				{#if admin}
					<Button href="/admin" variant="outline">
						<ShieldUser />
						Admin
					</Button>
				{/if}
					<Separator orientation="vertical" class="min-h-6" />
				<DropdownMenu.Root>
					<DropdownMenu.Trigger class={buttonVariants({ variant: "outline" })}>
						<UserCircle />
						Account
					</DropdownMenu.Trigger>
					<DropdownMenu.Content>
						<DropdownMenu.Group>
							<DropdownMenu.Label>My Account</DropdownMenu.Label>
							<DropdownMenu.Separator />
							<DropdownMenu.Item>
								{#snippet child({ props })}
									<a href="/home/gdpr" {...props}>
										<ShieldCheck />
										GDPR
									</a>
								{/snippet}
							</DropdownMenu.Item>
							<DropdownMenu.Item>
								{#snippet child({ props })}
									<a href="/home/help" {...props}>
										<HelpingHand />
										Assistance
									</a>
								{/snippet}
							</DropdownMenu.Item>
							<DropdownMenu.Separator />
							<DropdownMenu.Item>
								{#snippet child(props)}
									<form {...Auth.logout}>
										<Button
											type="submit"
											{...props}
											variant="destructive"
											class="w-full">Logout</Button
										>
									</form>
								{/snippet}
							</DropdownMenu.Item>
						</DropdownMenu.Group>
					</DropdownMenu.Content>
				</DropdownMenu.Root>
			</div>
		</div>
		<div id="subheader"></div>
	</header>

	<!-- Main Content -->
	<main class="flex-1">
		{@render children?.()}
	</main>
</div>
