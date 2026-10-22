<script>
	import { onMount } from "svelte";
	import { Details, Radios, Radio } from "@onsvisual/svelte-components";

	let { layer = $bindable(), layerOptions } = $props();
</script>

<div class="floating-map-control">
	<Details cls="details-small" title="Show best-fit">
		<Radios items={layerOptions} bind:value={layer} compact></Radios>
	</Details>
</div>

<style>
	:global(.details-small) {
		margin-top: 2px;
	}
	:global(.details-small),
	:global(.details-small .ons-u-fs-r--b) {
		font-size: 14px !important;
	}
	:global(.details-small .ons-details__heading) {
		padding-left: 1.5rem;
	}
	:global(.details-small .ons-details__content) {
		margin: 0;
		border: 0;
		padding: 0;
	}
	:global(.details-small .ons-fieldset) {
		max-width: 180px;
	}
	:global(.details-small .ons-radios__item:not(:last-child)) {
		margin-bottom: 4px;
	}
</style>
