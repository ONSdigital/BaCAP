<script>
	import { getContext } from "svelte";
	import { resolve } from "$app/paths";
	import {
		Hero,
		Container,
		Section,
		Grid,
		Card,
		Notice,
		Radios,
		Checkbox,
		Select,
		Button,
		Divider,
		Details,
		Table,
		Icon,
		List,
		Li
	} from "@onsvisual/svelte-components";
	import AreaSearch from "$lib/ui/AreaSearch.svelte";
	import EditModal from "$lib/ui/EditModal.svelte";
	import { downloadDatasetCSV, downloadDatasetXLSX } from "$lib/util/io";
	import { geogroups, measures } from "$lib/config";
	import { getData, pivotDataOnMeasures } from "$lib/util/data";

	const width = "wider";
	const columns = [
		{ key: "areanm", label: "Area name" },
		{ key: "category", label: "Category" },
		{ key: "date", label: "Time period" },
		...measures.map((d) => ({ key: d.label.toLowerCase(), label: d.label, numeric: true }))
	];

	let { data } = $props();

	let appState = $state(getContext("appState")());
	let { savedAreas } = appState;

	const ltlaTypes = new Set(["E06", "E07", "E08", "E09", "W06"]);
	const parentAreaTypes = new Set([...ltlaTypes, "E10", "E12", "E47", "E92", "W92"]);
	const areasList = getContext("areasList")();
	const areasLookup = Object.fromEntries(areasList.map((d) => [d.areacd, d]));
	const childLookup = getContext("childLookup")();
	const filteredAreasList = areasList.filter((d) => parentAreaTypes.has(d.areacd.slice(0, 3)));

	function getChildTypes(area) {
		return [...geogroups]
			.reverse()
			.filter((grp) =>
				grp.codes.some((cd) =>
					(["E12", "E47"].includes(area.properties.areacd.slice(0, 3))
						? [...area.properties.child_typecds, "E07"]
						: area.properties.child_typecds || []
					).includes(cd)
				)
			)
			.map((grp) => ({ id: grp.key, label: grp.label, codes: grp.codes }));
	}

	const bestFits = getContext("bestFits")();

	function getAllChildren(props, includeParent = false) {
		console.log({ props, includeParent });

		const children = includeParent ? [props, ...props.children] : props.children;
		if (childLookup[props.areacd]) {
			const cds = new Set(children.map((d) => d.areacd));
			for (const cd of childLookup[props.areacd]) {
				if (!cds.has(cd)) {
					cds.add(cd);
					children.push(areasLookup[cd]);
				}
			}
			return children;
		}
		return children;
	}

	function makeSelectedAreas(
		selectionType,
		selectedAreaGroup,
		selectedParentArea,
		selectedChildType,
		includeParent
	) {
		if (selectionType?.id === "saved")
			return selectedAreaGroup?.label
				? Object.values($savedAreas).filter(
						(d) => d?.properties?.group === selectedAreaGroup.label
					)
				: null;
		return selectedChildType?.codes
			? getAllChildren(selectedParentArea.properties, includeParent)
					.filter(
						(d) =>
							selectedChildType.codes.includes(d.areacd.slice(0, 3)) ||
							d.areacd === selectedParentArea.properties.areacd
					)
					.map((d) => {
						const fits = bestFits[d.areacd] || [[d.areacd]];
						return {
							type: "Feature",
							geometry: null,
							properties: {
								...d,
								areanm: d.areanm || d.areacd,
								oa21cds: fits[0],
								lsoa21cds: fits[fits.length - 1]
							}
						};
					})
			: null;
	}

	const selectionTypes = [
		{ id: "saved", label: "A group of saved areas" },
		{ id: "children", label: "Areas within a larger area" }
	];
	let selectionType = $state.raw(selectionTypes[0]);

	let areaGroups = $derived(
		[...new Set(Object.values($savedAreas).map((d) => d?.properties?.group))].map((d) => ({
			id: d,
			label: d
		}))
	);
	let selectedAreaGroup = $derived(areaGroups[0]);
	let activeParentArea = $state.raw();
	let selectedParentArea = $state.raw();
	let includeParent = $state(false);
	let childTypes = $derived(
		selectedParentArea?.geojson ? getChildTypes(selectedParentArea.geojson) : []
	);
	let selectedChildType = $derived(childTypes[0] || null);

	let selectedAreas = $derived(
		makeSelectedAreas(
			selectionType,
			selectedAreaGroup,
			selectedParentArea?.geojson,
			selectedChildType,
			includeParent
		)
	);

	let activeTopic = $state.raw();
	let selectedTopic = $derived(!!selectedAreas && null); // Gets reset when new areas selected

	let selectedData = $derived(
		selectedTopic && selectedAreas?.length ? await getData(selectedTopic, selectedAreas) : null
	);
	$inspect({ selectedData });
</script>

<Hero
	theme="grey"
	title="Download datasets"
	lede="Select a group of areas to download a dataset"
	{width}
/>

<Grid {width} colWidth="wide" marginTop>
	<Card title="1. Choose selection type" cls="ons-text-indent">
		<Radios
			id="selection-type"
			items={selectionTypes}
			bind:value={selectionType}
			title="Choose selection type"
			hideTitle
			compact
		/>
	</Card>
	{#if selectionType?.id === "saved"}
		<Card title="2. Select area group" cls="ons-text-indent">
			{#if areaGroups.length}
				<Radios
					id="area-group"
					items={areaGroups}
					bind:value={selectedAreaGroup}
					title="Select area group"
					hideTitle
					compact
				/>
				<div class="ons-u-mt-s">
					<EditModal {savedAreas} />
					<p class="ons-u-mt-xs"><a href={resolve("/draw")} small>Draw a new area</a></p>
				</div>
			{:else}
				<p>
					You don't currently have any saved areas. Try the <a href={resolve("/draw")}
						>draw an area</a
					> tool or choose "areas within a larger area" to select pre-defined areas.
				</p>
			{/if}
		</Card>
	{:else}
		<Card title="2. Select a parent area" cls="ons-text-indent">
			<form
				class="input-group"
				onsubmit={(e) => {
					e.preventDefault();
					selectedParentArea = activeParentArea;
					selectedChildType = childTypes[0];
				}}
			>
				<AreaSearch
					bind:value={activeParentArea}
					options={filteredAreasList}
					label="Find an area"
					geoTypes={parentAreaTypes}
					postcodeTypes={ltlaTypes}
				/>
				<Button type="submit" disabled={!activeParentArea} small>Select area</Button>
			</form>
		</Card>
		{#if selectedParentArea && childTypes?.length}
			<Card title="3. Select child area type" cls="ons-text-indent">
				<Radios
					id="area-group"
					items={childTypes}
					bind:value={selectedChildType}
					title="Select area group"
					hideTitle
					compact
				/>
				<Checkbox
					cls="ons-u-mt-s"
					label="Include {selectedParentArea?.label} in selection"
					bind:checked={includeParent}
					compact
				/>
			</Card>
		{/if}
	{/if}
</Grid>
{#if selectedAreas?.length}
	<Divider {width} />
	<Container {width}>
		<Details title="View {selectedAreas.length} selected areas">
			<List mode="dash">
				{#each selectedAreas as area, i}
					<Li>
						<strong>{area.properties.areanm || `Unnamed Area ${i}`}</strong>
						{#if area.properties.areacd}({area.properties.areacd}){/if}
					</Li>
				{/each}
			</List>
		</Details>
	</Container>
	<Divider {width} />
	<Container {width} marginBottom>
		<div class="ons-text-indent">
			<h2 class="ons-u-fs-m">
				{selectionType?.id === "saved" ? "3" : "4"}. Select a dataset
			</h2>
			<p>
				Find out more about the available datasets in the <a href={resolve("/glossary")}
					>data glossary</a
				>.
			</p>
			<form
				id="select-dataset"
				class="input-group"
				onsubmit={(e) => {
					e.preventDefault();
					selectedTopic = activeTopic;
				}}
			>
				<Select bind:value={activeTopic} options={data.topics} groupKey="topic" />
				<Button type="submit" small>Select dataset</Button>
			</form>
		</div>
	</Container>
	{#if selectedData}
		{@const pivotedData = pivotDataOnMeasures(selectedData.data)}
		<Section {width} title={selectedData.meta.label}>
			<p>
				{selectedData.meta.summary}
				<a href="https://www.ons.gov.uk/{selectedData.meta.url}"
					>Read more<span class="ons-u-vh"> (opens in a new tab)</span></a
				>
				<Icon type="external" />
			</p>
			<Notice mode="warning"
				>The data provided here is aggregated on a best-fit basis, so may not precisely
				match other data sources.</Notice
			>
			{#key selectedData}
				<Table data={pivotedData} {columns} sortable />
			{/key}
			<Button
				icon="download"
				on:click={() => downloadDatasetXLSX(selectedData.meta, pivotedData, columns)}
				>Download as XLSX</Button
			>
			<Button
				icon="download"
				on:click={() => downloadDatasetCSV(selectedData.meta, pivotedData, columns)}
				>Download as CSV</Button
			>
		</Section>
	{/if}
{/if}

<style>
	.input-group {
		display: flex;
		flex-direction: row;
		align-items: flex-end;
		gap: 4px;
		margin: 6px 0 4px;
		max-width: 600px;
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
