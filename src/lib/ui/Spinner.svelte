<script lang="ts">
	// Loading animation with an optional message. By default it fills a 500px-high block, eg. while
	// the app loads. Set `inline` for a compact version with the message beside it, to place over or
	// next to other content (the parent positions it).
	let { message = null, inline = false } = $props();
</script>

<div class="loading-spinner-container" class:inline role="status">
	<div class="loading-spinner"></div>
	{#if message}<div class={inline ? "ons-u-fs-r" : "ons-u-fs-s"}>{message}</div>{/if}
</div>

<style>
	.loading-spinner-container {
		position: relative;
		width: 100%;
		height: 500px;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
	}
	.loading-spinner-container.inline {
		width: auto;
		height: auto;
		flex-direction: row;
		gap: 8px;
		white-space: nowrap;
	}
	/* CSS adapted from https://cssloaders.github.io */
	.loading-spinner {
		--bar-width: 10px;
		width: calc(4 * var(--bar-width));
		height: calc(2.5 * var(--bar-width));
		flex-shrink: 0;
		background:
			linear-gradient(
				var(--ons-color-branded-tint) calc(1 * 100% / 6),
				var(--ons-color-branded) 0 calc(3 * 100% / 6),
				var(--ons-color-branded-tint) 0
			),
			linear-gradient(
				var(--ons-color-branded-tint) calc(2 * 100% / 6),
				var(--ons-color-branded) 0 calc(4 * 100% / 6),
				var(--ons-color-branded-tint) 0
			),
			linear-gradient(
				var(--ons-color-branded-tint) calc(3 * 100% / 6),
				var(--ons-color-branded) 0 calc(5 * 100% / 6),
				var(--ons-color-branded-tint) 0
			);
		background-size: var(--bar-width) 400%;
		background-repeat: no-repeat;
		animation: matrix 1.5s infinite linear;
	}
	.inline .loading-spinner {
		/* Scaled from 6px with the text, from small (14px) to regular body size (18px) */
		--bar-width: calc(6px * 18 / 14);
	}
	@keyframes matrix {
		0% {
			background-position:
				0% 100%,
				50% 100%,
				100% 100%;
		}
		100% {
			background-position:
				0% 0%,
				50% 0%,
				100% 0%;
		}
	}
</style>
