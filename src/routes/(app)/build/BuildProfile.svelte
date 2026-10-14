<script>
	import { resolve } from "$app/paths";
	import { onMount } from "svelte";
	import pym from "pym.js";
	import { Notice, Details, Button, Icon, Textarea } from "@onsvisual/svelte-components";
	import BestFitDetails from "$lib/viz/BestFitDetails.svelte";
	import Spinner from "$lib/ui/Spinner.svelte";
	import { downloadProfileXLSX, downloadProfileCSV, downloadArea, clip } from "$lib/util/io";
	import { makeEmbedHash, makeEmbedCode, makeEmbedUrl, getData } from "$lib/util/data";
	import { simplifyGeo, makeFilename } from "$lib/util/geo";
	import { embedEvent, printEvent, copyAreaCodesEvent } from "$lib/util/analytics";

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
	// Tables are loaded in an effect rather than an awaited $derived, so the rest of the page keeps
	// updating while Nomis responds, and a loading message can be shown on the first load too
	let tables = $state.raw([]);
	let loading = $state(false);
	let loadFailed = $state(false);
	let retries = $state(0);
	let requestId = 0;

	$effect(() => {
		retries; // Re-run when the user clicks "Try again"
		const areas = [$activeArea, $comparisonArea].filter((d) => d);
		const topicsToLoad = $activeArea?.properties?.oa21cds
			? $selectedTopics
					.map((key) => topicsLookup[key])
					.filter(
						(t) =>
							t &&
							(!t.coverage || t.coverage.every((c) => buildState.coverage.has(c))) &&
							(t.geography === "oa21" || buildState.geography === "lsoa")
					)
			: [];

		const id = ++requestId; // Ignore responses to requests that have since been superseded
		loading = true;
		loadFailed = false;
		Promise.all(topicsToLoad.map((t) => getData(t, areas)))
			.then((results) => {
				if (id === requestId) tables = results.filter((d) => d);
			})
			.catch((err) => {
				console.warn(err);
				if (id === requestId) loadFailed = true;
			})
			.finally(() => {
				if (id === requestId) loading = false;
			});
	});
	let embedHash = $derived(
		makeEmbedHash(tables, buildState, $activeArea, $comparisonArea, areaPolygon, compPolygon)
	);
	$inspect({ tables });
	$effect(() => {
		if (pymParent) pymParent.iframe.contentWindow.location.hash = embedHash;
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
		return () => {
			pymParent?.remove?.();
			pymParent = null;
		};
	});
</script>

<Notice mode="warning"
	>The data provided here is aggregated on a best-fit basis, so may not precisely represent the
	selected geographic boundary.</Notice
>
<BestFitDetails {activeArea} {centroids} />
<hr class="ons-u-mt-m ons-u-mb-m" />
{#if loadFailed}
	<Notice mode="error">Sorry, there was a problem loading data for this profile.</Notice>
	<Button cls="ons-u-mt-s ons-u-mb-s" small on:click={() => retries++}>Try again</Button>
{/if}
<div class="embed-container">
	{#if loading}
		<div class="embed-loading"><Spinner inline message="Loading data..." /></div>
	{/if}
	<div id="embed"></div>
</div>
<h2 class="ons-u-fs-m ons-u-mb-3xs">Export and share this profile</h2>
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
		>
		or
		<a
			href="#0"
			onclick={(e) => {
				e.preventDefault();
				pymParent?.sendMessage?.("png");
			}}>PNG</a
		>
	</li>
	<li>
		<Icon type="print" />
		<a
			href="#0"
			onclick={(e) => {
				e.preventDefault();
				pymParent?.sendMessage?.("print");
				printEvent({ area: $activeArea?.properties });
			}}>Print profile</a
		>
	</li>
	<li>
		<Icon type="code" />
		<a
			href="#0"
			onclick={(e) => {
				e.preventDefault();
				showEmbed = !showEmbed;
			}}>{showEmbed ? "Hide embed code" : "Get embed code"}</a
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
				embedEvent({ area: $activeArea?.properties, url: makeEmbedUrl() });
			}}
			small>Copy embed code</Button
		>
		{#if confirmed.embed}<Icon type="tick" marginLeft />{/if}
	</div>
{/if}
<h2 class="ons-u-fs-m ons-u-mt-s ons-u-mb-3xs">Export selected area</h2>
<ul class="profile-actions">
	<li>
		<Icon type="download" /> Download area as
		<a
			href="#0"
			onclick={(e) => {
				e.preventDefault();
				downloadArea($activeArea, makeFilename($activeArea, "geojson"));
			}}>GeoJSON</a
		>
	</li>
	<li>
		<Icon type="copy" />
		<a
			href="#0"
			onclick={(e) => {
				e.preventDefault();
				showCodes = !showCodes;
			}}>{showCodes ? "Hide area codes" : "Get area codes"}</a
		>
	</li>
</ul>
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
				copyAreaCodesEvent({
					label: "Copy Output Area codes",
					area: $activeArea?.properties
				});
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
				copyAreaCodesEvent({ label: "Copy LSOA codes", area: $activeArea?.properties });
			}}
			small>Copy LSOA codes</Button
		>
		{#if confirmed.lsoa}<Icon type="tick" marginLeft />{/if}
	</div>
{/if}

<style>
	.embed-container {
		position: relative;
	}
	.embed-loading {
		position: absolute;
		top: 0;
		right: 0;
		z-index: 1;
		padding: 6px 10px;
		background: rgba(255, 255, 255, 0.9);
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
	.profile-actions-tray :global(.ons-btn) {
		margin: 4px 0 1em;
	}
	.profile-actions-tray > :global(.ons-icon) {
		color: var(--ons-color-success);
		margin-top: 10px;
	}
</style>
