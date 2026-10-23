<script lang="ts">
	import { Icon, ToolbarIcon, Button } from "@onsvisual/svelte-components";
	import { modalToggleEvent } from "$lib/util/analytics";

	let {
		title,
		label,
		hideLabel = false,
		icon = null,
		buttonStyle = "menu",
		children,
		onOpen = () => null,
		onConfirm = () => null,
		onCancel = () => null,
		onClose = () => null
	} = $props();

	let id = $derived(title.toLowerCase().replaceAll(" ", "-"));
	let dialog = $state();

	function setBodyOverflow(value) {
		const style = document?.body?.style;
		if (style) style.overflow = value;
	}

	function showModal() {
		dialog.showModal();
		setBodyOverflow("hidden");
		modalToggleEvent({ label: title, value: "open" });
	}

	function handleClose() {
		// Fires however the dialog is closed (close button, Esc, click outside, confirm, cancel) -
		// unlike onConfirm/onCancel, which only fire from the specific paths that call them below
		setBodyOverflow("visible");
		modalToggleEvent({ label: title, value: "close" });
		onClose();
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

	export function openDialog() {
		showModal();
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
			showModal();
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
			showModal();
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
	onclose={handleClose}
>
	<h1 {id} tabindex="-1">{title}</h1>
	<button
		class="btn-close"
		onclick={() => {
			dialog.close();
			onCancel();
		}}><Icon type="cross" size="l" /></button
	>
	<div class="modal-contents">
		{@render children()}
	</div>
</dialog>

<style>
	/* Scoped to [open]: a plain .ons-modal-simple selector would set `display` on the dialog in its
	   closed state too, overriding the browser's own display:none default for a closed <dialog> (an
	   author stylesheet rule wins over that default regardless of specificity once it matches at
	   all), which would make every modal render visibly on the page even before it's opened. */
	.ons-modal-simple[open] {
		position: relative;
		display: flex;
		flex-direction: column;
		width: 800px;
		max-width: calc(100% - 2rem);
		max-height: calc(100vh - 4rem);
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
	/* Lets content that needs more room than fits (eg. a long area list) scroll within the modal,
	   rather than overflowing past its edge - only the element that opts in with flex:1 1 auto and
	   min-height:0 (eg. LoadModal's .saved-areas-container) actually grows/shrinks or scrolls; this
	   chain just lets that sizing reach it through the tabs, down from the modal's own max-height. */
	.modal-contents {
		flex: 1 1 auto;
		min-height: 0;
		display: flex;
		flex-direction: column;
	}
	.modal-contents :global(.ons-tabs) {
		flex: 1 1 auto;
		min-height: 0;
		display: flex;
		flex-direction: column;
		margin-bottom: 0;
	}
	/* The design system gives this a negative z-index, which was previously inert - it was a plain
	   static child of a non-flex .ons-tabs, and z-index only applies to positioned elements or flex
	   items. Making .ons-tabs a flex container (above) turns it into a flex item, so that z-index
	   now takes effect and sinks the tab nav behind the (z-index: auto) panel below it, making the
	   tabs unclickable. Overriding it back above the panel restores normal click behaviour. */
	.modal-contents :global(.ons-tabs__container) {
		z-index: 1;
	}
	.modal-contents :global(.ons-tabs__panel:not(.ons-tabs__panel--hidden)) {
		flex: 1 1 auto;
		min-height: 0;
		display: flex;
		flex-direction: column;
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
