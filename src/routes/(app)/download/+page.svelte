<script>
	import { getContext } from "svelte";
	import { resolve } from "$app/paths";
	import {
		Hero,
		Container,
		Section,
		Notice,
		Radios,
		Radio,
		Checkbox,
		Checkboxes,
		Select,
		Button,
		Divider,
		Details,
		Table,
		Icon,
		Em,
		Tooltip,
		Indent
	} from "@onsvisual/svelte-components";
	import AreaSearch from "$lib/ui/AreaSearch.svelte";
	import EditModal from "$lib/ui/EditModal.svelte";
	import { downloadDatasetCSV, downloadDatasetXLSX } from "$lib/util/io";
	import { geogroups, measures, defaultAreaName, onsColors } from "$lib/config";
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
	let { savedAreas, selectedAreas } = appState;

	const ltlaTypes = new Set(["E06", "E07", "E08", "E09", "W06"]);
	const parentAreaTypes = new Set([...ltlaTypes, "E10", "E12", "E47", "E92", "W92"]);
	const areasList = getContext("areasList")();
	const areasLookup = Object.fromEntries(areasList.map((d) => [d.areacd, d]));
	const childLookup = getContext("childLookup")();

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
		const children = props.children;
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

	function makeChildAreas(selectedArea, childTypes, includeParent) {
		const areas = childTypes?.length ? getAllChildren(selectedArea.properties) : [];
		if (includeParent) areas.unshift(selectedArea.properties);
		return areas
			.filter(
				(d) =>
					childTypes
						.map((type) => type.codes)
						.flat()
						.includes(d.areacd.slice(0, 3)) ||
					d.areacd === selectedArea.properties.areacd
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
						// lsoa21cs is same as oa21cds if length === 1
						lsoa21cds: fits[fits.length - 1]
					}
				};
			});
	}

	function addAreasToSelection(areas) {
		const selectedAreaCodes = new Set($selectedAreas.map((d) => d.properties.areacd));
		$selectedAreas = [
			...$selectedAreas,
			...areas.filter((d) => !selectedAreaCodes.has(d.properties.areacd))
		];
	}

	function makeSavedAreaOptions(savedAreas) {
		const options = [];
		let noNameIndex = 1;
		let noCodeIndex = 1;

		for (const obj of Object.values(savedAreas)) {
			const area = { ...obj };
			area.selected = false;
			area.properties = { ...obj.properties };
			if (!area.properties?.areanm) {
				area.properties.areanm = `${defaultAreaName} ${noNameIndex}`;
				noNameIndex += 1;
			}
			if (!area.properties?.areacd) {
				area.properties.areacd = `Z99${String(noCodeIndex).padStart(6, "0")}`;
				noCodeIndex += 1;
			}
			options.push(area);
		}
		return options;
	}

	const selectionTypes = [
		{ id: "search", label: "Search for areas" },
		{ id: "saved", label: "Choose from saved areas" }
	];

	let step = $state($selectedAreas?.length ? 2 : 1);

	let savedAreaOptions = $state(makeSavedAreaOptions($savedAreas));
	let selectionType = $state.raw(selectionTypes[0]);

	let activeArea = $state.raw();
	let includeParent = $state(true);
	let childTypes = $derived(activeArea?.geojson ? getChildTypes(activeArea.geojson) : []);
	let childTypesChecked = $derived(childTypes.map(() => false));

	let activeTopic = $state.raw();
	let selectedTopic = $derived(!!$selectedAreas && null); // Gets reset when new areas selected

	let selectedData = $derived(
		selectedTopic && $selectedAreas?.length
			? await getData(selectedTopic, $selectedAreas)
			: null
	);
	$inspect({ selectedData });
</script>

<Hero
	theme="grey"
	title="Download datasets"
	lede="Select a group of areas to download a dataset"
	{width}
/>

<Container {width}>
	{#if step === 2}
		<div class="ons-summary ons-summary--hub">
			<div class="ons-summary__group">
				<dl class="ons-summary__items">
					<div class="ons-summary__item">
						<dt class="ons-summary__item-title">
							<div class="ons-summary__item--text ons-u-fs-m">
								<Em mode="badge" fontSize="16px">STEP 1</Em>
								<span>Select areas</span>
							</div>
						</dt>
						<dd class="ons-summary__values">
							<span class="ons-summary__text"
								>{$selectedAreas.length} areas selected</span
							>
						</dd>
						<dd class="ons-summary__actions">
							<a
								href="#0"
								class="ons-summary__button"
								onclick={(e) => {
									e.preventDefault();
									step = 1;
								}}
							>
								<span class="ons-summary__button-text" aria-hidden="true"
									>Change areas</span
								>
							</a>
						</dd>
					</div>
				</dl>
			</div>
		</div>
	{:else}
		<h2 class="ons-u-fs-m ons-u-mt-s">
			<Em mode="badge" fontSize="16px" color={onsColors.oceanBlue}>STEP 1</Em>
			<span>Select areas</span>
		</h2>
		<Radios>
			<Radio
				groupId="selection-type"
				item={selectionTypes[0]}
				bind:value={selectionType}
				compact
			/>
			{#if selectionType?.id === "search"}
				<Indent>
					<form
						class="col-auto-width"
						onsubmit={(e) => {
							e.preventDefault();
							addAreasToSelection(
								makeChildAreas(
									activeArea.geojson,
									childTypes.filter((d, i) => childTypesChecked[i]),
									includeParent
								)
							);
						}}
					>
						<AreaSearch
							bind:value={activeArea}
							options={areasList}
							label="Find an area by name"
							geoTypes={parentAreaTypes}
							postcodeTypes={ltlaTypes}
							clearable
							onChange={() => (includeParent = true)}
						/>
						{#if activeArea}
							{#key activeArea}
								<Checkboxes
									id="searched-areas"
									cls="ons-u-mt-xs"
									label="Choose areas"
									compact
								>
									<Checkbox
										label="{activeArea.label} ({activeArea.group})"
										bind:checked={includeParent}
										compact
									/>
									{#each childTypes as childType, i}
										<Checkbox
											label="All {childType.label}s in {activeArea.label}"
											bind:checked={childTypesChecked[i]}
											compact
										/>
									{/each}
								</Checkboxes>
							{/key}
						{/if}
						<Button cls="ons-u-mt-2xs" type="submit" small disabled={!activeArea}
							>Add to selection</Button
						>
					</form>
				</Indent>
			{/if}
			<Radio
				groupId="selection-type"
				item={selectionTypes[1]}
				bind:value={selectionType}
				compact
			/>
			{#if selectionType?.id === "saved"}
				<Indent>
					{#if Object.keys($savedAreas)?.length}
						<form
							class="col-auto-width"
							onsubmit={(e) => {
								e.preventDefault();
								addAreasToSelection(savedAreaOptions.filter((d) => d.selected));
							}}
						>
							<Checkboxes id="saved-areas">
								<Checkbox
									id="areas-all"
									label="Select all"
									compact
									checked={savedAreaOptions.every((d) => d.selected)}
									on:change={(e) => {
										const isChecked = e?.detail?.e?.target?.checked;
										for (const area of savedAreaOptions)
											area.selected = isChecked;
									}}
								/>
								<hr class="input-divider" />
								{#each savedAreaOptions as area}
									<Checkbox
										id={area.id}
										label={area.properties.areanm}
										bind:checked={area.selected}
										compact
									/>
								{/each}
							</Checkboxes>
							<div class="ons-u-mt-s">
								<Button
									type="submit"
									small
									disabled={!savedAreaOptions.some((d) => d.selected)}
									>Add to selection</Button
								>
								<EditModal {savedAreas} />
								<!-- <p class="ons-u-mt-xs">
							<a href={resolve("/draw")} small>Draw a new area</a>
						</p> -->
							</div>
						</form>
					{:else}
						<p>
							You don't currently have any saved areas. Try the <a
								href={resolve("/draw")}>draw an area</a
							> tool or choose "search for areas" to select pre-defined areas.
						</p>
					{/if}
				</Indent>
			{/if}
		</Radios>
		{#if $selectedAreas?.length}
			<Details cls="ons-u-mt-xs" title="Show {$selectedAreas.length} selected areas">
				<table class="ons-table ons-table--bottom-space ons-table--responsive">
					<thead class="ons-table__head">
						<tr class="ons-table__row">
							<th scope="col" class="ons-table__header ons-table__header--top"
								>Name</th
							>
							<th scope="col" class="ons-table__header ons-table__header--top"
								>Code</th
							>
							<th></th>
						</tr>
					</thead>
					<tbody class="ons-table__body">
						{#each $selectedAreas as area, i}
							<tr class="ons-table__row">
								<td class="ons-table__cell ons-table__cell--top">
									{area.properties.areanm || `${defaultAreaName} ${i}`}
								</td>
								<td class="ons-table__cell ons-table__cell--top">
									{area.properties.areacd}
								</td>
								<td
									class="ons-table__cell ons-table__cell--top ons-table__cell--numeric"
								>
									<Tooltip text="Remove area">
										<Button
											variant="secondary"
											icon="cross"
											small
											hideLabel
											on:click={() =>
												($selectedAreas = $selectedAreas.filter(
													(d) =>
														d.properties.areacd !==
														area.properties.areacd
												))}>Remove area</Button
										>
									</Tooltip>
								</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</Details>
			<div class="ons-u-mt-s">
				<Button
					variant="secondary"
					icon="cross"
					small
					on:click={() => ($selectedAreas = [])}>Clear all areas</Button
				>
				<Button icon="arrow" iconPosition="after" small on:click={() => (step = 2)}
					>Next step</Button
				>
			</div>
		{/if}
	{/if}
</Container>

{#if step === 2}
	<Container {width}>
		<h2 class="ons-u-fs-m ons-u-mt-s">
			<Em mode="badge" fontSize="16px" color={onsColors.oceanBlue}>STEP 2</Em>
			<span>Select a dataset</span>
		</h2>
		<p>
			Find out more about the available datasets in the <a href={resolve("/glossary")}
				>data glossary</a
			>.
		</p>
		<form
			id="select-dataset"
			class="col-auto-width"
			onsubmit={(e) => {
				e.preventDefault();
				selectedTopic = activeTopic;
			}}
		>
			<Select
				label="Choose a dataset"
				placeholder="Select or type a dataset name"
				bind:value={activeTopic}
				options={data.topics}
				groupKey="topic"
			/>
			<Button cls="ons-u-mt-2xs" type="submit" small disabled={!activeTopic}
				>Select dataset</Button
			>
		</form>
	</Container>
	{#if selectedData}
		{@const pivotedData = pivotDataOnMeasures(selectedData.data)}
		<Section {width} title={selectedData.meta.label} marginTop>
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
			<h2 class="ons-u-fs-m ons-u-mb-3xs">Get the data</h2>
			<ul class="profile-actions">
				<li>
					<Icon type="download" /> Download data as
					<a
						href="#0"
						onclick={(e) => {
							e.preventDefault();
							downloadDatasetXLSX(selectedData.meta, pivotedData, columns);
						}}>XLSX</a
					>
					or
					<a
						href="#0"
						onclick={(e) => {
							e.preventDefault();
							() => downloadDatasetCSV(selectedData.meta, pivotedData, columns);
						}}>CSV</a
					>
				</li>
			</ul>
		</Section>
	{/if}
{/if}
<Divider {width} hr={false} />

<style>
	.col-auto-width {
		width: 350px;
		max-width: calc(100vw - 58px);
	}
	.ons-u-fs-m > span {
		display: inline-block;
		transform: translateY(-2px);
	}
	h2.ons-u-fs-m {
		padding-top: 5px;
	}
	ul.profile-actions {
		list-style-type: none;
		padding: 0;
		margin: 0;
	}
	ul.profile-actions > li {
		display: inline-block;
		padding: 0;
		margin-right: 16px;
	}
</style>
