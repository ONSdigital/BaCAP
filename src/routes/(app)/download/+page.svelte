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
	import { downloadDatasetCSV, downloadDatasetXLSX } from "$lib/utils.js";
	import { geogroups, measures } from "$lib/config.js";
	import getData from "$lib/get-data.js";
	import { pivotDataOnMeasures } from "$lib/data-utils.js";

	const width = "wider";
	const columns = [
		{ key: "areanm", label: "Area name" },
		{ key: "category", label: "Category" },
		{ key: "date", label: "Time period" },
		...measures.map((d) => ({ key: d.label.toLowerCase(), label: d.label, numeric: true }))
	];

	let { data } = $props();

	let appState = $state(getContext("appState")());
	let { savedAreas, savedAreasLastId } = appState;

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

	function getAllChildren(props) {
		if (childLookup[props.areacd]) {
			const children = [...props.children];
			const cds = new Set(children.map((d) => d.areacd));
			for (const cd of childLookup[props.areacd]) {
				if (!cds.has(cd)) {
					cds.add(cd);
					children.push(areasLookup[cd]);
				}
			}
			return children;
		}
		return props.children;
	}

	function makeSelectedAreas(
		selectionType,
		selectedAreaGroup,
		selectedParentArea,
		selectedChildType
	) {
		if (selectionType?.id === "saved")
			return selectedAreaGroup?.label
				? Object.values($savedAreas).filter(
						(d) => d?.properties?.group === selectedAreaGroup.label
					)
				: null;
		return selectedChildType?.codes
			? getAllChildren(selectedParentArea.properties)
					.filter((d) => selectedChildType.codes.includes(d.areacd.slice(0, 3)))
					.map((d) => {
						const fits = bestFits[d.areacd] || [[d.areacd]];
						return {
							type: "Feature",
							geometry: null,
							properties: { ...d, oa21cds: fits[0], lsoa21cds: fits[fits.length - 1] }
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
	let includeParent = $state(true);
	let childTypes = $derived(
		selectedParentArea?.geojson ? getChildTypes(selectedParentArea.geojson) : []
	);
	let selectedChildType = $derived(childTypes[0] || null);

	let selectedAreas = $derived(
		makeSelectedAreas(
			selectionType,
			selectedAreaGroup,
			selectedParentArea?.geojson,
			selectedChildType
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
	<Card title="1. Choose selection type">
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
		<Card title="2. Select area group">
			{#if areaGroups.length}
				<Radios
					id="area-group"
					items={areaGroups}
					bind:value={selectedAreaGroup}
					title="Select area group"
					hideTitle
					compact
				/>
				<p class="ons-u-mt-s">
					<Button variant="secondary" icon="edit" small>Edit saved areas</Button>
				</p>
			{:else}
				<p>
					You don't currently have any saved areas. Try the <a href={resolve("/draw")}
						>draw an area</a
					> tool or choose "areas within a larger area" to select pre-defined areas.
				</p>
			{/if}
		</Card>
	{:else}
		<Card title="2. Select a parent area">
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
		{#if childTypes?.length}
			<Card title="3. Select child area type">
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
					label="Include parent area in selection"
					bind:checked={includeParent}
					compact
				/>
			</Card>
		{/if}
	{/if}
</Grid>
{#if selectedAreas?.length}
	<Container {width}>
		<Details title="View {selectedAreas.length} selected areas">
			<List mode="dash">
				{#each selectedAreas as area, i}
					<Li>
						<strong>{area.properties.areanm || `Custom Area ${i}`}</strong>
						{#if area.properties.areacd}({area.properties.areacd}){/if}
					</Li>
				{/each}
			</List>
		</Details>
	</Container>
	<Divider {width} />
	<Container {width} marginBottom>
		<h3>{selectionType?.id === "saved" ? "3" : "4"}. Select a dataset</h3>
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
				on:click={() => downloadDatasetCSV(selectedData.meta, selectedData.data)}
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
