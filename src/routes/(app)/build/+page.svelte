<script>
	import { resolve } from "$app/paths";
	import { goto, afterNavigate } from "$app/navigation";
	import { onMount, getContext } from "svelte";
	import {
		Breadcrumb,
		Hero,
		Notice,
		Grid,
		GridCell,
		Accordion,
		AccordionItem,
		Details,
		Checkboxes,
		Checkbox,
		Input,
		Button,
		Tooltip,
		Icon,
		Textarea
	} from "@onsvisual/svelte-components";
	import LoadModal from "$lib/ui/LoadModal.svelte";
	import BestFitMap from "$lib/viz/BestFitMap.svelte";
	import pym from "pym.js";
	import { geoUrl } from "$lib/config.js";
	import { slugify, downloadData, clip } from "$lib/utils.js";
	import { makeEmbedHash, makeEmbedCode } from "$lib/data-utils.js";
	import {
		parseGeoJSON,
		simplifyGeo,
		downloadArea,
		makeFilename,
		isValidAreaCode
	} from "$lib/geo.svelte.js";
	import getData from "$lib/get-data.js";

	let { data } = $props();

	let buildState = $state({
		coverage: null,
		includeAreaMap: true,
		includeCompMap: false
	});
	let appState = $state(getContext("appState")());
	let { activeArea, comparisonArea, history, selectedTopics, savedAreas, savedAreasLastId } =
		appState;
	let areaPolygon = $derived($activeArea?.geometry ? simplifyGeo($activeArea.geometry) : null);
	let compPolygon = $derived(
		$comparisonArea?.geometry ? simplifyGeo($comparisonArea.geometry) : null
	);

	let pymParent = $state(); // Binding for responsive embed iframe

	let showEmbed = $state(false);
	let showCodes = $state(false);
	let confirmed = $state({ oa: false, lsoa: false, embed: false });

	const areasList = getContext("areasList")();
	const centroids = getContext("centroids")();

	let topicsLookup = $derived(Object.fromEntries(data.topics.map((d) => [d.key, d])));
	let tables = $derived(
		$activeArea?.properties?.oa21cds
			? await Promise.all(
					$selectedTopics.map((id) =>
						getData(topicsLookup[id], $activeArea, $comparisonArea)
					)
				)
			: []
	);
	let embedHash = $derived(
		makeEmbedHash(tables, buildState, $activeArea, $comparisonArea, areaPolygon, compPolygon)
	);
	$effect(() => {
		if (pymParent) pymParent.iframe.contentWindow.location.hash = embedHash;
		console.log({ pymParent, embedHash });
	});

	function groupTopics(topics) {
		const groups = {};
		for (const topic of topics) {
			if (!groups[topic.topic])
				groups[topic.topic] = {
					key: slugify(topic.topic),
					label: topic.topic,
					children: []
				};
			groups[topic.topic].children.push(topic);
		}
		return Object.values(groups);
	}

	function updateTopics(item) {
		const ids = data.topics.map((d) => d.key);
		if (item.checked)
			$selectedTopics = ids.filter((id) => $selectedTopics.includes(id) || id === item.id);
		else $selectedTopics = $selectedTopics.filter((id) => id !== item.id);
	}

	async function setConfirmed(type = "oa") {
		confirmed[type] = true;
		await new Promise((resolve) => setTimeout(resolve, 3000));
		confirmed[type] = false;
	}

	onMount(async () => {
		// if (!$history?.[0]?.geometry) goto(resolve("/draw"));

		const code = (window.location.hash || "").slice(1);
		if (isValidAreaCode(code)) {
			// Load area if the URL has a GSS code in its hash
			const url = `${geoUrl}/${code.slice(0, 3)}/${code}.json`;
			try {
				const data = await (await fetch(url)).json();
				$activeArea = parseGeoJSON(data, centroids);
				console.log("history", window.history);
				window.history.replaceState(null, null, " ");
			} catch (err) {
				console.warn(err);
			}
		} else {
			// Otherwise refresh active area
			$activeArea.geometry = $history[0].geometry;
			$activeArea.properties.oa21cds = centroids.compress($history[0].oa);
			$activeArea.properties.lsoa21cds = centroids.compress($history[0].lsoa);
			$activeArea = $activeArea;
		}

		// Refresh comparison area
		const compcd = centroids.commonParent({
			raw: centroids.expand($activeArea.properties.oa21cds),
			compresed: $activeArea.properties.oa21cds
		});
		buildState.coverage = compcd[0] === "K" ? new Set(["E", "W"]) : new Set([compcd[0]]);
		try {
			const url = `${geoUrl}/${compcd.slice(0, 3)}/${compcd}.json`;
			const data = await (await fetch(url)).json();
			$comparisonArea = parseGeoJSON(data, centroids);
		} catch (err) {
			console.warn(err);
			$comparisonArea = null;
		}

		// Initialise embed iframe
		if (!pymParent) {
			pymParent = new pym.Parent("embed", resolve(`/embed#${embedHash || ""}`), {
				name: "embed",
				id: "iframe",
				title: "Embedded area profile"
			});
		}
		return {
			destroy: () => {
				pymParent?.remove?.();
				pymParent = null;
			}
		};
	});

	$inspect({ appState });
	$inspect({ tables });
	$inspect({ $activeArea });
</script>

<Breadcrumb
	width="wider"
	theme="grey"
	links={[
		{ label: "Home", href: "/" },
		{ label: "Build a custom area profile", href: resolve("/") }
	]}
/>
<Hero width="wider" theme="grey" title="Build your area profile">
	<div>
		<Button icon="arrow" iconRotation={180} href={resolve("/draw")} small
			>Edit selected area</Button
		>
	</div>
</Hero>
<Grid width="wider" colWidth="medium" marginTop>
	<GridCell>
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
						updateSelection={(area) => console.log({ area })}
					/>
				</Tooltip>
			</div>
			<Checkbox
				label="Show map in profile"
				bind:checked={buildState.includeAreaMap}
				compact
			/>
			<div class="input-group">
				<Input
					label="Comparison area"
					value={$comparisonArea?.properties?.areanm}
					readonly
				/>
				<Tooltip text="Load an area">
					<LoadModal
						bind:activeArea={comparisonArea}
						bind:savedAreas
						bind:savedAreasLastId
						{areasList}
						{centroids}
						mode="build"
						updateSelection={(area) => console.log({ area })}
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
		<!-- <div class="selections-divider"></div> -->
		<h2 class="ons-u-fs-m ons-u-mb-3xs">Select datasets</h2>
		<Accordion>
			{#each groupTopics(data.topics, buildState.coverage) as group, i (group.key)}
				<AccordionItem title={group.label} open={i === 0}>
					<Checkboxes>
						{#each group.children as topic}
							<Checkbox
								id={topic.key}
								label={topic.label}
								checked={$selectedTopics.includes(topic.key)}
								groupName="topics"
								on:change={(e) => updateTopics(e?.detail?.item)}
								compact
							/>
						{/each}
					</Checkboxes>
				</AccordionItem>
			{/each}
		</Accordion>
	</GridCell>
	<GridCell colspan={3}>
		<Notice mode="warning"
			>The data presented here is aggregated on a best-fit basis, so may not precisely
			represent the selected geographic boundary.</Notice
		>
		<Details title="Show actual best-fit boundaries" cls="ons-u-mt-s ons-u-mb-s">
			<p>
				Some datasets are aggregated from Output Areas &mdash; the smallest statistical
				geography &mdash; whereas others are based on larger LSOAs. The map below compares
				your selected geographic boundary with the actual underlying statistical areas
				available in the datasets.
			</p>
			<p>
				If the two best-fit boundaries do not match, we advise caution in comparing values
				from datasets based on Output Areas with those based on LSOAs.
			</p>
			{#if $activeArea?.properties?.oa21cds}
				<BestFitMap {activeArea} {centroids} />
			{/if}
		</Details>
		<hr class="ons-u-mt-m ons-u-mb-m" />
		<div id="embed"></div>
		<h2 class="ons-u-fs-m ons-u-mb-3xs">Use and share this profile</h2>
		<ul class="profile-actions">
			<li>
				<Icon type="download" /> Download profile as
				<a
					href="#0"
					onclick={(e) => {
						e.preventDefault();
						downloadData(tables, $activeArea, $comparisonArea);
					}}>CSV</a
				>,
				<a
					href="#0"
					onclick={(e) => {
						e.preventDefault();
						pymParent?.sendMessage?.("png");
					}}>PNG</a
				>
				or
				<a
					href="#0"
					onclick={(e) => {
						e.preventDefault();
						downloadArea($activeArea, makeFilename($activeArea, "geojson"));
					}}>GeoJSON</a
				>
			</li>
			<li>
				<Icon type="code" />
				<a
					href="#0"
					onclick={(e) => {
						e.preventDefault();
						showCodes = false;
						showEmbed = !showEmbed;
					}}>{showEmbed ? "Hide embed code" : "Get embed code"}</a
				>
			</li>
			<li>
				<Icon type="copy" />
				<a
					href="#0"
					onclick={(e) => {
						e.preventDefault();
						showEmbed = false;
						showCodes = !showCodes;
					}}>{showCodes ? "Hide area codes" : "Copy area codes"}</a
				>
			</li>
			<li>
				<Icon type="print" />
				<a
					href="#0"
					onclick={(e) => {
						e.preventDefault();
						pymParent?.sendMessage?.("print");
					}}>Print profile</a
				>
			</li>
		</ul>
		{#if showEmbed}
			{@const embedCode = makeEmbedCode(embedHash)}
			<div class="profile-actions-tray">
				<Textarea rows={4} label="Embed code" value={embedCode} readonly />
				<Button
					icon="copy"
					on:click={() => {
						clip(embedCode);
						setConfirmed("embed");
					}}
					small>Copy embed code</Button
				>
				{#if confirmed.embed}<Icon type="tick" marginLeft />{/if}
			</div>
		{/if}
		{#if showCodes}
			{@const oaCodes = [
				...centroids.expand($activeArea?.properties?.oa21cds || [], "oa")
			].join(",")}
			{@const lsoaCodes = [
				...centroids.expand($activeArea?.properties?.lsoa21cds || [], "lsoa")
			].join(",")}
			<div class="profile-actions-tray">
				<Textarea
					rows={2}
					width="100%"
					label="Output Area codes"
					value={oaCodes}
					readonly
				/>
				<Button
					icon="copy"
					on:click={() => {
						clip(oaCodes);
						setConfirmed("oa");
					}}
					small>Copy Output Area codes</Button
				>
				{#if confirmed.oa}<Icon type="tick" marginLeft />{/if}
				<Textarea rows={2} width="100%" label="LSOA codes" value={lsoaCodes} readonly />
				<Button
					icon="copy"
					on:click={() => {
						clip(lsoaCodes);
						setConfirmed("lsoa");
					}}
					small>Copy LSOA codes</Button
				>
				{#if confirmed.lsoa}<Icon type="tick" marginLeft />{/if}
			</div>
		{/if}
	</GridCell>
</Grid>

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
	ul.profile-actions {
		list-style-type: none;
		padding: 0;
		margin: 0;
	}
	ul.profile-actions > li {
		display: inline-block;
		padding: 0;
		margin-right: 12px;
	}
	.profile-actions-tray :global(.ons-btn) {
		margin: 4px 0 1em;
	}
	.profile-actions-tray > :global(.ons-icon) {
		color: var(--ons-color-success);
		margin-top: 10px;
	}
</style>
