<script>
	import { Checkbox, Input, Button, Tooltip } from "@onsvisual/svelte-components";
	import LoadModal from "$lib/ui/LoadModal.svelte";
	import { focusChildInput } from "$lib/util/common";

	let {
		buildState = $bindable(),
		activeArea = $bindable(),
		comparisonArea = $bindable(),
		savedAreas = $bindable(),
		savedAreasLastId = $bindable(),
		lastActivePage = $bindable(),
		areasList,
		centroids,
		updateActiveArea = () => null
	} = $props();

	let editName = $state(false);
	let activeName = $derived(
		!$activeArea.geometry ? null : $activeArea?.properties?.areanm || "Unnamed Area"
	);
	let comparisonModal = $state();
</script>

<h2 class="ons-u-fs-m ons-u-mb-3xs">Select areas</h2>
<div class="area-selection-container">
	<div class="area-selection">
		<div class="input-group">
			{#if editName}
				<form
					onsubmit={(e) => {
						e.preventDefault();
						$activeArea.properties.areanm = activeName;
						editName = false;
					}}
					style:display="contents"
					use:focusChildInput
				>
					<Input
						label="Primary area"
						placeholder="Name your area"
						width="100%"
						bind:value={activeName}
					/>
					<Tooltip text="Confirm">
						<Button
							type="submit"
							variant="secondary"
							icon="tick"
							color="white"
							hideLabel
							small>Confirm</Button
						>
					</Tooltip>
				</form>
			{:else}
				<div class="ons-field">
					<p class="ons-label">Primary area</p>
					<div class="ons-input area-name">{activeName}</div>
				</div>
				{#if $activeArea.geometry}
					<Tooltip text="Edit area name">
						<Button
							variant="secondary"
							icon="edit"
							color="white"
							hideLabel
							small
							on:click={() => (editName = true)}>Edit area name</Button
						>
					</Tooltip>
				{/if}
			{/if}
			<Tooltip text="Load an area">
				<LoadModal
					bind:activeArea
					bind:savedAreas
					bind:savedAreasLastId
					{areasList}
					{centroids}
					mode="build"
					updateSelection={(area) => {
						$lastActivePage = "build";
						updateActiveArea(area);
					}}
				/>
			</Tooltip>
		</div>
		<Checkbox label="Show map in profile" bind:checked={buildState.includeAreaMap} compact />
	</div>
	<div class="area-selection" class:hidden={!$comparisonArea}>
		<div class="input-group">
			<div class="ons-field">
				<p class="ons-label">Comparison area</p>
				<div class="ons-input area-name">{$comparisonArea?.properties?.areanm}</div>
			</div>
			<a
				href="#0"
				style:position="absolute"
				style:top="4px"
				style:right="0"
				onclick={(e) => {
					e.preventDefault();
					$comparisonArea = null;
				}}>Remove</a
			>
			<Tooltip text="Load an area">
				<LoadModal
					bind:activeArea={comparisonArea}
					bind:savedAreas
					bind:savedAreasLastId
					bind:modal={comparisonModal}
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
	{#if !$comparisonArea}
		<div class="ons-u-mt-3xs">
			<a
				href="#0"
				onclick={(e) => {
					e.preventDefault();
					comparisonModal.openDialog();
				}}>Add comparison area</a
			>
		</div>
	{/if}
</div>

<style>
	.area-selection-container {
		margin-bottom: 1em;
	}
	.area-selection {
		background: var(--ons-color-hero-bg);
		padding: 0.2em 0.5em 1em;
		border-top: 1px solid var(--ons-color-borders);
		border-bottom: 1px solid var(--ons-color-borders);
	}
	.area-selection + .area-selection {
		border-top: none;
	}
	.input-group {
		position: relative;
		z-index: 2;
		display: flex;
		flex-direction: row;
		align-items: flex-end;
		gap: 4px;
		margin: 0 0 4px;
		padding-top: 6px;
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
	.input-group :global(.ons-label) {
		/* font-weight: normal; */
	}
	.area-name {
		border-color: rgba(0, 0, 0, 0);
		padding-left: 0;
	}
	.hidden {
		visibility: hidden;
		height: 0;
		margin: 0;
		padding: 0;
		overflow: hidden;
	}
</style>
