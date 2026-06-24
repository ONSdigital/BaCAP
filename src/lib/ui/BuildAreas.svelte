<script>
	import { Checkbox, Input, Tooltip } from "@onsvisual/svelte-components";
	import LoadModal from "$lib/ui/LoadModal.svelte";

	let {
		buildState = $bindable(),
		activeArea = $bindable(),
		comparisonArea = $bindable(),
		savedAreas = $bindable(),
		savedAreasLastId = $bindable(),
		lastActivePage = $bindable(),
		areasList,
		centroids
	} = $props();
</script>

<h2 class="ons-u-fs-m ons-u-mb-3xs">Select areas</h2>
<div class="area-selections">
	<div class="input-group">
		<Input
			label="Primary area"
			placeholder="Name your area"
			width="100%"
			bind:value={$activeArea.properties.areanm}
		/>
		<Tooltip text="Load an area">
			<LoadModal
				bind:activeArea
				bind:savedAreas
				bind:savedAreasLastId
				{areasList}
				{centroids}
				mode="build"
				updateSelection={() => ($lastActivePage = "build")}
			/>
		</Tooltip>
	</div>
	<Checkbox label="Show map in profile" bind:checked={buildState.includeAreaMap} compact />
	<div class="input-group">
		<Input label="Comparison area" value={$comparisonArea?.properties?.areanm} readonly />
		<Tooltip text="Load an area">
			<LoadModal
				bind:activeArea={comparisonArea}
				bind:savedAreas
				bind:savedAreasLastId
				{areasList}
				{centroids}
				mode="build"
				updateSelection={() => ($lastActivePage = "build")}
			/>
		</Tooltip>
	</div>
	<Checkbox
		label="Include on map"
		bind:checked={buildState.includeCompMap}
		disabled={!buildState.includeAreaMap}
		compact
	/>
</div>

<style>
	.area-selections {
		background: var(--ons-color-hero-bg);
		padding: 0.5em 0.75em 1.5em;
		margin-bottom: 1em;
	}
	.input-group {
		display: flex;
		flex-direction: row;
		align-items: flex-end;
		gap: 4px;
		margin: 6px 0 4px;
	}
	.input-group :global(.ons-btn__inner) {
		height: 37px;
		transform: translateY(-3px);
	}
	.input-group :global(.ons-label) {
		margin-bottom: 4px;
	}
	.input-group :global(.ons-field) {
		flex-grow: 1;
	}
	.input-group :global(.ons-btn) {
		flex-shrink: 1;
	}
	.input-group :global .selections-divider {
		border-bottom: 1px solid var(--ons-color-borders);
		padding-bottom: 1em;
		margin-bottom: 1em;
	}
</style>
