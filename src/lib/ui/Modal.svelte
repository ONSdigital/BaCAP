<script lang="ts">
	import { Icon, ToolbarIcon, Button, analyticsEvent } from "@onsvisual/svelte-components";

	let {
		title,
		label,
		hideLabel = false,
		icon = null,
		buttonStyle = "menu",
		children,
		onOpen = () => null,
		onConfirm = () => null,
		onCancel = () => null
	} = $props();

	let id = $derived(title.toLowerCase().replaceAll(" ", "-"));
	let dialog = $state();

	function setBodyOverflow(value) {
		const style = document?.body?.style;
		if (style) style.overflow = value;
	}

	function initDialog(el) {
		// Prevent areas dropdown from closing when scrollbar is clicked
		el.addEventListener("mousedown", (event) => {
			if (event.target.closest(".autocomplete__menu")) {
				event.preventDefault();
			}
		});

		// Click outside to close dialog
		el.addEventListener("pointerup", (event) => {
			const rect = el.getBoundingClientRect();
			const isInDialog =
				event.clientY > rect.top &&
				event.clientX > rect.left &&
				// event.clientY < rect.bottom &&
				event.clientX < rect.right;
			if (!isInDialog) {
				el.close();
				onCancel();
			}
		});

		return {
			destroy: () => setBodyOverflow("visible")
		};
	}

	function modalAnalyticsEvent(interactionValue) {
		const eventData = {
			event: "interaction",
			interactionType: "modal-toggle",
			interactionLabel: label,
			interactionValue
		};
		analyticsEvent(eventData);
	}

	export function openDialog() {
		dialog.showModal();
		setBodyOverflow("hidden");
		onOpen();
	}

	export function confirmDialog() {
		dialog.close();
		onConfirm();
	}

	export function cancelDialog() {
		dialog.close();
		onCancel();
	}
</script>

{#if buttonStyle === "menu"}
	<button
		type="button"
		aria-label={label}
		class="toolbar-button"
		onclick={() => {
			onOpen();
			dialog.showModal();
			setBodyOverflow("hidden");
			modalAnalyticsEvent("open");
		}}
	>
		{#if icon}
			<ToolbarIcon type={icon} /><span class="ons-u-vh">{label}</span>
		{:else}
			{label}
		{/if}
	</button>
{:else}
	<Button
		{icon}
		{hideLabel}
		variant={buttonStyle}
		on:click={() => {
			onOpen();
			dialog.showModal();
			setBodyOverflow("hidden");
			modalAnalyticsEvent("open");
		}}
		small
	>
		{label}
	</Button>
{/if}

<dialog
	class="ons-modal-simple"
	aria-labelledby={id}
	bind:this={dialog}
	use:initDialog
	onclose={() => setBodyOverflow("visible")}
>
	<h1 {id} tabindex="-1">{title}</h1>
	<button
		class="btn-close"
		onclick={() => {
			dialog.close();
			onCancel();
			modalAnalyticsEvent("cancel");
		}}><Icon type="cross" size="l" /></button
	>
	<div class="modal-contents">
		{@render children()}
	</div>
</dialog>

<style>
	.ons-modal-simple {
		position: relative;
		width: 800px;
		max-width: calc(100% - 2rem);
		overflow: visible;
		border: 0;
		border-radius: 0.4rem;
		box-shadow: 0 0 7px 0#000;
		outline: 2px solid transparent;
	}
	.ons-modal-simple::backdrop {
		backdrop-filter: blur(3px);
		background: rgba(0, 0, 0, 0.6);
	}
	.ons-modal-simple :global(.ons-btn__text) {
		text-align: left;
		white-space: initial;
	}
	.modal-contents :global(.ons-tabs) {
		margin-bottom: 0;
	}
	:global(.autocomplete__dropdown-arrow-down-wrapper) {
		pointer-events: none;
	}
	.toolbar-button {
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 0.5rem;
		background: none;
		border: none;
		cursor: pointer;
		flex-shrink: 0;
		flex-grow: 0;
	}
	.toolbar-button:hover {
		background-color: #f5f5f6;
		border-radius: 8px;
	}

	.toolbar-button:focus {
		outline: 2px solid #fbc900;
		outline-offset: 2px;
		box-shadow: 0 0 2px 2px #222222;
		border-radius: 8px;
	}
	.btn-close {
		position: absolute;
		top: 10px;
		right: 10px;
		padding: 8px;
		background: none;
		border: none;
		cursor: pointer;
	}
</style>
