<script>
	// Shows a message while data is loading. Pass `loading`, or leave it unset to show the message
	// while async work (eg. an awaited Nomis request) is pending in the nearest boundary.
	let { loading = null, message = "Loading data..." } = $props();
</script>

<p class="loading-status" role="status">
	{#if loading ?? $effect.pending()}<span class="loading-spinner"></span>{message}{/if}
</p>

<style>
	.loading-status {
		display: flex;
		align-items: center;
		gap: 8px;
		min-height: 1.5em;
		margin: 0 0 8px;
	}
	.loading-spinner {
		width: 16px;
		height: 16px;
		border: 2px solid var(--ons-color-borders);
		border-top-color: var(--ons-color-branded);
		border-radius: 50%;
		animation: spin 1s linear infinite;
	}
	@keyframes spin {
		to {
			transform: rotate(360deg);
		}
	}
</style>
