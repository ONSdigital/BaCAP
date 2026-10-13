<script>
	import { Details } from "@onsvisual/svelte-components";
	import BestFitMap from "./BestFitMap.svelte";

	let { activeArea, centroids } = $props();
</script>

<Details title="Show boundary and best-fit areas on a map" cls="ons-u-mt-s ons-u-mb-s">
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
