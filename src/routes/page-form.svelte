<script lang="ts">
	import * as Field from "$lib/components/field";
	import * as InputGroup from "$lib/components/input-group";
	import * as Auth from "$lib/remotes/auth.remote";
	import { Mail, Rocket, TriangleAlert } from "@lucide/svelte";
	import type { Attachment } from "svelte/attachments";
	import { Button } from "$lib/components/button";
	import { PUBLIC_CAPTCHA_SITE_KEY } from "$env/static/public";
	import { isHttpError } from "@sveltejs/kit";
	import { toast } from "svelte-sonner";
	import { captcha } from "$lib/remotes/schemas";
	import { ensure } from "$lib/utils";

	const preflight = Auth.login.preflight(captcha);
	const form = preflight.enhance(async (data) => {
		const [success, error] = await ensure(data.submit());
		if (success) {
			return toast.success("Magic link sent. Please check your inbox.", {
				closeButton: false,
				position: "bottom-left",
			});
		}

		if (isHttpError(error)) {
			return toast.error(error.body.message, {
				position: "bottom-left",
			});
		}

		return toast.error("An unexpected error occurred.", {
			position: "bottom-left",
		});
	});

	const issues = $derived(preflight.fields.email.issues());
	const links = [
		{ href: "/privacy", label: "Privacy Policy" },
		{ href: "/terms", label: "Terms of Service" },
		{ href: "/cookies", label: "Cookie Policy" },
		{ href: "/contact", label: "Contact" },
	];

	function turnstile(): Attachment {
		return (element) => {
			console.log("Rendering captcha...");
			// @ts-expect-error - Imported via script tag
			const id = window.turnstile.render(element, {
				sitekey: PUBLIC_CAPTCHA_SITE_KEY,
				theme: "auto",
				"response-field-name": "token",
				"retry-interval": 8000,
				"response-field": "true",
				language: "auto",
				"refresh-expired": "auto",
				"refresh-timeout": "auto",
				appearance: "always",
			});

			return () => {
				// @ts-expect-error - Imported via script tag
				window.turnstile.remove(id);
			};
		};
	}
</script>

<form {...form} enctype="multipart/form-data" class="w-80">
	<Field.Set>
		<Field.Group class="gap-0">
			<Field.Field>
				<InputGroup.Root class="h-10">
					<InputGroup.Input
						{...Auth.login.fields.email.as("text")}
						autocomplete="off"
						autocorrect="off"
						autocapitalize="none"
						placeholder="Type your email..."
						class="text-[14px]!"
					/>
					<InputGroup.Addon align="inline-start">
						<Mail class="size-4" />
					</InputGroup.Addon>
					<InputGroup.Addon align="inline-end">
						<InputGroup.Button
							disabled={!Auth.login.fields.email.value()}
							class="valid:animate-pulse"
							type="submit"
							loading={Auth.login.pending > 0}
							size="sm"
							variant="outline"
						>
							Submit
							<Rocket class="size-3" />
						</InputGroup.Button>
					</InputGroup.Addon>
				</InputGroup.Root>
				{#if issues && issues.length > 0}
					<Field.Error
						class="-mt-1 animate-pulse flex items-center gap-1 text-destructive"
					>
						<TriangleAlert class="size-4" />
						{issues.map((issue) => issue.message).join(", ")}
					</Field.Error>
				{/if}
				<div {@attach turnstile()}></div>
			</Field.Field>
		</Field.Group>
	</Field.Set>
	<nav class="flex items-center gap-2 text-sm">
		{#each links as link (link.href)}
			<li class="list-none">
				<Button
					variant="link"
					size="xs"
					class="text-muted-foreground px-0"
					href={link.href}
				>
					{link.label}
				</Button>
			</li>
		{/each}
	</nav>
</form>
