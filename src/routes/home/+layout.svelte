<script lang="ts">
	import * as Auth from "$lib/remotes/auth.remote";
	import Button from "$lib/components/button/button.svelte";
	import type { LayoutProps } from "./$types";

	const { children }: LayoutProps = $props();
</script>

<form {...Auth.logout}>
	<Button type="submit" variant="destructive">Logout</Button>
</form>
{@render children?.()}
