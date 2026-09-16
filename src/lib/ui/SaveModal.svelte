<script>
	import Modal from "./Modal.svelte";
	import { Tabs, Tab, Input, Button, Icon } from "@onsvisual/svelte-components";
	import { makeSavedArea, downloadArea } from "$lib/js/geo";
	import { sleep } from "$lib/js/utils";
	import { clip } from "$lib/js/io";

	let {
		activeArea = $bindable(),
		savedAreas = $bindable(),
		savedAreasLastId = $bindable(),
		history = $bindable(),
		modal = $bindable(),
		centroids,
		mode = "draw",
		switchModals = () => null
	} = $props();

	let showSuccess = $state({ oa: false, lsoa: false, saved: false });

	function updateAreaName(e) {
		const name = e?.detail?.value;
		if (name) {
			$activeArea.properties.areanm = name;
			$activeArea = $activeArea;
		}
	}
	function saveArea(options = {}) {
		const _options = { copy: false, switchModals: false, ...options };
		const existing = $savedAreas[$activeArea.id];
		const hasNewId = _options.copy || !existing?.id;
		const id = hasNewId ? $savedAreasLastId + 1 : existing.id;
		const area = makeSavedArea($activeArea, $history[0], centroids, id);
		$activeArea = area;
		$savedAreas[id] = area;
		if (hasNewId) $savedAreasLastId = id;
		if (_options.switchModals) {
			switchModals();
			window.location.hash = "#saved-areas";
		}
	}
	async function updateSuccess(key) {
		showSuccess[key] = true;
		await sleep(3000);
		showSuccess[key] = false;
	}
	async function copyCodes(key = "oa") {
		const codes = [...($history?.[0]?.[key] || [])].join(",");
		await clip(codes);
		await updateSuccess(key);
	}
</script>

<Modal
	bind:this={modal}
	title="Save current area"
	label="Save current area"
	buttonStyle={mode === "draw" ? "menu" : "primary"}
	hideLabel
	icon="save"
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
				{#if $savedAreas[$activeArea.id]}
					<Button
						icon="saveas"
						small
						on:click={() => {
							saveArea();
							updateSuccess("saved");
						}}>Save changes</Button
					>
					<Button
						icon="save"
						variant="secondary"
						small
						disabled={!$activeArea.id}
						on:click={() => saveArea({ copy: true, switchModals: true })}
						>Save a copy</Button
					>
				{:else}
					<Button icon="save" small on:click={() => saveArea({ switchModals: true })}
						>Save area</Button
					>
				{/if}
				<Button
					icon="download"
					variant="secondary"
					small
					on:click={() =>
						downloadArea(makeSavedArea($activeArea, $history[0], centroids))}
					>Download GeoJSON</Button
				>
				<span
					class="success-icon"
					style:display={showSuccess.saved ? "inline-block" : "none"}
				>
					<Icon type="tick" /> Changes saved
				</span>
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
					<span class="success-icon" style:display={showSuccess.oa ? "inline" : "none"}>
						<Icon type="tick" /> Copied codes
					</span>
				</div>
				<div>
					<Button variant="primary" icon="copy" small on:click={() => copyCodes("lsoa")}
						>Copy LSOA codes</Button
					>
					<span
						class="success-icon"
						style:display={showSuccess.lsoa ? "inline-block" : "none"}
					>
						<Icon type="tick" /> Copied codes
					</span>
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
		transform: translateY(2px);
	}
	.success-icon :global(svg > path) {
		fill: var(--ons-color-success);
	}
</style>
