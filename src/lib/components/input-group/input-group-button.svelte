<script lang="ts" module>
	import { tv, type VariantProps } from "tailwind-variants";

	const inputGroupButtonVariants = tv({
		base: "gap-2 rounded-md text-xs/relaxed flex items-center shadow-none cursor-pointer",
		variants: {
			size: {
				xs: "h-5 gap-1 rounded-[calc(var(--radius-sm)-2px)] px-1 [&>svg:not([class*='size-'])]:size-3",
				sm: "gap-1",
				"icon-xs": "size-6 p-0 has-[>svg]:p-0",
				"icon-sm": "size-7 p-0 has-[>svg]:p-0",
			},
		},
		defaultVariants: {
			size: "xs",
		},
	});

	export type InputGroupButtonSize = VariantProps<
		typeof inputGroupButtonVariants
	>["size"];
</script>

<script lang="ts">
	import { cn } from "$lib/utils.js";
	import type { ComponentProps } from "svelte";
	import { Button } from "$lib/components/button/index.js";
	import { Loader } from "@lucide/svelte";

	let {
		ref = $bindable(null),
		class: className,
		children,
		type = "button",
		variant = "ghost",
		size = "xs",
		loading = false,
		disabled,
		...restProps
	}: Omit<ComponentProps<typeof Button>, "href" | "size"> & {
		size?: InputGroupButtonSize;
		loading?: boolean;
	} = $props();
</script>

<Button
	bind:ref
	{type}
	data-size={size}
	{variant}
	disabled={loading || disabled}
	class={cn(inputGroupButtonVariants({ size }), className)}
	{...restProps}
>
	{#if loading}
		Please wait
		<Loader class="animate-spin"/>
	{:else}
		{@render children?.()}
	{/if}
</Button>
