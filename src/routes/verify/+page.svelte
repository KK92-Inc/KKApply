<script>
	import { goto } from '$app/navigation';

	let email = $state('');
	let verificationCode = $state('');
	let isLoading = $state(false);
	let error = $state('');
	let step = $state('email'); // 'email' or 'code'

	async function submitEmail() {
		if (!email) {
			error = 'Please enter an email address';
			return;
		}

		isLoading = true;
		error = '';

		try {
			const response = await fetch('/api/verify/send-code', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ email })
			});

			if (response.ok) {
				step = 'code';
			} else {
				error = 'Failed to send verification code';
			}
		} catch (e) {
			error = 'An error occurred';
		} finally {
			isLoading = false;
		}
	}

	async function submitCode() {
		if (!verificationCode) {
			error = 'Please enter the verification code';
			return;
		}

		isLoading = true;
		error = '';

		try {
			const response = await fetch('/api/verify/confirm-code', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ email, code: verificationCode })
			});

			if (response.ok) {
				goto('/dashboard');
			} else {
				error = 'Invalid verification code';
			}
		} catch (e) {
			error = 'An error occurred';
		} finally {
			isLoading = false;
		}
	}
</script>

<div class="container">
	<h1>Verify Your Email</h1>

	{#if step === 'email'}
		<form on:submit|preventDefault={submitEmail}>
			<input
				type="email"
				placeholder="Enter your email"
				bind:value={email}
				disabled={isLoading}
			/>
			<button type="submit" disabled={isLoading}>
				{isLoading ? 'Sending...' : 'Send Code'}
			</button>
		</form>
	{:else}
		<form on:submit|preventDefault={submitCode}>
			<p>Verification code sent to {email}</p>
			<input
				type="text"
				placeholder="Enter verification code"
				bind:value={verificationCode}
				disabled={isLoading}
			/>
			<button type="submit" disabled={isLoading}>
				{isLoading ? 'Verifying...' : 'Verify'}
			</button>
			<button type="button" on:click={() => (step = 'email')}>
				Back
			</button>
		</form>
	{/if}

	{#if error}
		<p class="error">{error}</p>
	{/if}
</div>

<style>
	.container {
		max-width: 400px;
		margin: 2rem auto;
		padding: 2rem;
		border: 1px solid #ccc;
		border-radius: 8px;
	}

	h1 {
		text-align: center;
		margin-bottom: 2rem;
	}

	form {
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}

	input {
		padding: 0.75rem;
		border: 1px solid #ddd;
		border-radius: 4px;
		font-size: 1rem;
	}

	button {
		padding: 0.75rem;
		background: #007bff;
		color: white;
		border: none;
		border-radius: 4px;
		cursor: pointer;
		font-size: 1rem;
	}

	button:disabled {
		background: #ccc;
		cursor: not-allowed;
	}

	.error {
		color: #d32f2f;
		margin-top: 1rem;
		text-align: center;
	}
</style>
