<script>
	import { resolve } from "$app/paths";
	import { onMount } from "svelte";
	import pym from "pym.js";
	import { Notice, Details, Button, Icon, Textarea } from "@onsvisual/svelte-components";
	import BestFitMap from "$lib/viz/BestFitMap.svelte";
	import { downloadProfileXLSX, downloadProfileCSV, clip } from "$lib/js/io";
	import { makeEmbedHash, makeEmbedCode } from "$lib/js/data";
	import { simplifyGeo, downloadArea, makeFilename } from "$lib/js/geo";
	import { getData } from "$lib/js/data";

	let { buildState, topics, selectedTopics, activeArea, comparisonArea, centroids } = $props();

	let pymParent = $state(); // Binding for responsive embed iframe

	let areaPolygon = $derived($activeArea?.geometry ? simplifyGeo($activeArea.geometry) : null);
	let compPolygon = $derived(
		$comparisonArea?.geometry ? simplifyGeo($comparisonArea.geometry) : null
	);

	let showEmbed = $state(false);
	let showCodes = $state(false);
	let confirmed = $state({ oa: false, lsoa: false, embed: false });

	let topicsLookup = $derived(Object.fromEntries(topics.map((d) => [d.key, d])));
	let tables = $derived(
		$activeArea?.properties?.oa21cds
			? await Promise.all(
					$selectedTopics
						.map((key) => topicsLookup[key])
						.filter(
							(t) =>
								(!t.coverage ||
									(t.coverage &&
										t.coverage.every((c) => buildState.coverage.has(c)))) &&
								(t.geography === "oa21" || buildState.geography === "lsoa")
						)
						.map((t) =>
							getData(
								t,
								[$activeArea, $comparisonArea].filter((d) => d)
							)
						)
				)
			: []
	);
	let embedHash = $derived(
		makeEmbedHash(tables, buildState, $activeArea, $comparisonArea, areaPolygon, compPolygon)
	);
	$inspect({ tables });
	$effect(() => {
		if (pymParent) pymParent.iframe.contentWindow.location.hash = embedHash;
		console.log({ pymParent, embedHash });
	});

	async function setConfirmed(type = "oa") {
		confirmed[type] = true;
		await new Promise((resolve) => setTimeout(resolve, 3000));
		confirmed[type] = false;
	}

	onMount(() => {
		// Initialise embed iframe
		if (!pymParent) {
			pymParent = new pym.Parent("embed", resolve(`/profile/#${embedHash || ""}`), {
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
</script>

<Notice mode="warning"
	>The data provided here is aggregated on a best-fit basis, so may not precisely represent the
	selected geographic boundary.</Notice
>
<Details title="Show actual best-fit boundaries" cls="ons-u-mt-s ons-u-mb-s">
	<p>
		Some datasets are aggregated from Output Areas (OAs) &mdash; the smallest statistical
		geography &mdash; whereas others are based on larger Lower-layer Super Output Areas (LSOAs).
		The map below compares your selected geographic boundary with the actual underlying
		statistical areas available in the datasets.
	</p>
	<p>
		If the two best-fit boundaries do not match, we advise caution in comparing values from
		datasets based on Output Areas with those based on LSOAs.
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
				downloadProfileXLSX(tables, $activeArea, $comparisonArea);
			}}>XLSX</a
		>,
		<a
			href="#0"
			onclick={(e) => {
				e.preventDefault();
				downloadProfileCSV(tables, $activeArea, $comparisonArea);
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
<ul class="profile-actions">
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
	{@const oaCodes = [...centroids.expand($activeArea?.properties?.oa21cds || [], "oa")].join(",")}
	{@const lsoaCodes = [
		...centroids.expand($activeArea?.properties?.lsoa21cds || [], "lsoa")
	].join(",")}
	<div class="profile-actions-tray">
		<Textarea rows={2} width="100%" label="Output Area codes" value={oaCodes} readonly />
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

<style>
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
	.profile-actions-tray :global(.ons-btn) {
		margin: 4px 0 1em;
	}
	.profile-actions-tray > :global(.ons-icon) {
		color: var(--ons-color-success);
		margin-top: 10px;
	}
</style>
