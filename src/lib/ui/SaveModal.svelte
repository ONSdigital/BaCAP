<script>
	import Modal from "./Modal.svelte";
	import { Tabs, Tab, Input, Button, Icon } from "@onsvisual/svelte-components";
	import { makeSavedArea, downloadArea } from "$lib/geo.svelte.js";
	import { clip, sleep } from "$lib/utils.js";

	let {
		activeArea = $bindable(),
		savedAreas = $bindable(),
		history = $bindable(),
		modal = $bindable(),
		centroids,
		switchModals = () => null
	} = $props();

	let showSuccess = $state({ oa: false, lsoa: false });

	function updateAreaName(e) {
		const name = e?.detail?.value;
		if (name) {
			$activeArea.properties.areanm = name;
			$activeArea = $activeArea;
		}
	}
	function saveArea(options = {}) {
		const existing = $savedAreas[$activeArea.id];
		const id =
			existing?.id && !options.copy
				? existing.id
				: Math.max(...[0, ...Object.keys($savedAreas)]) + 1;
		const area = makeSavedArea($activeArea, $history[0], centroids, id);
		$activeArea = area;
		$savedAreas[id] = area;
		// $savedAreas = $savedAreas;
	}
	async function copyCodes(level = "oa") {
		const codes = [...($history?.[0]?.[level] || [])].join(",");
		await clip(codes);
		showSuccess[level] = true;
		await sleep(3000);
		showSuccess[level] = false;
	}
</script>

<Modal
	bind:this={modal}
	title="Save current area"
	label="Save current area"
	hideLabel
	icon="download"
	onOpen={() => null}
	onConfirm={() => null}
	onCancel={() => null}
>
	<Tabs>
		<Tab title="Save area">
			<p>
				Give your area a name and then download it or save it for later (<a
					href="#saved-areas"
					onclick={switchModals}>view saved areas</a
				>).
			</p>
			<Input
				label="Name your area"
				value={$activeArea.properties?.areanm}
				on:change={updateAreaName}
			/>
			<div class="ons-u-mt-2xs">
				<Button
					icon="download"
					small
					on:click={() =>
						downloadArea(makeSavedArea($activeArea, $history[0], centroids))}
					>Download area</Button
				>
				{#if $savedAreas[$activeArea.id]}
					<Button icon="saveas" variant="secondary" small on:click={saveArea}
						>Save changes</Button
					>
					<Button
						icon="save"
						variant="secondary"
						small
						disabled={!$activeArea.id}
						on:click={() => saveArea({ copy: true })}>Save a copy</Button
					>
				{:else}
					<Button icon="save" variant="secondary" small on:click={saveArea}
						>Save area</Button
					>
				{/if}
			</div>
		</Tab>
		<Tab title="Copy area codes">
			<p>
				Copy the best-fit Output Area or best-fit LSOA codes for your current selected area.
			</p>
			<div class="copy-buttons">
				<div>
					<Button variant="primary" icon="copy" small on:click={() => copyCodes("oa")}
						>Copy Output Area codes</Button
					>
					<span class="success-icon" style:display={showSuccess.oa ? "inline" : "none"}
						><Icon type="tick" /></span
					>
				</div>
				<div>
					<Button variant="primary" icon="copy" small on:click={() => copyCodes("lsoa")}
						>Copy LSOA codes</Button
					>
					<span class="success-icon" style:display={showSuccess.lsoa ? "inline" : "none"}
						><Icon type="tick" /></span
					>
				</div>
			</div>
		</Tab>
	</Tabs>
</Modal>

<style>
	.copy-buttons {
		display: flex;
		flex-direction: column;
		gap: 8px;
	}
	.success-icon {
		padding-left: 6px;
	}
	.success-icon :global(svg > path) {
		fill: var(--ons-color-success);
	}
</style>
