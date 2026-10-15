<script>
	import { resolve } from "$app/paths";
	import {
		Hero,
		Button,
		Section,
		Grid,
		Card,
		List,
		Li,
		Notice,
		Icon
	} from "@onsvisual/svelte-components";

	let { data } = $props();
</script>

<Hero
	width="wider"
	theme="lightblue"
	cls="page-banner"
	title="A flexible way to get local data"
	lede="Define your own geographic area and explore {data.topics
		.length} datasets covering England and Wales down to a neighbourhood level"
>
	<div
		class="header-image"
		style:background="var(--ons-color-hero-bg) right top / auto 100% no-repeat url('{resolve(
			'/img/banner-image.svg'
		)}')"
	></div>
	<span>
		<Button icon="arrow" iconPosition="after" href={resolve("/draw")}>Get started</Button>
	</span>
</Hero>

<Grid width="wider" colWidth="wide" marginTop>
	<Card title="Create an area" href={resolve("/draw")} mode="featured">
		<p>In order to select an area, you can:</p>
		<List mode="bullet">
			<Li>find an area in the search box</Li>
			<Li>draw your own area on the map</Li>
			<Li>upload an area boundary</Li>
		</List>
	</Card>
	<Card title="Build a profile" href={resolve("/build")} mode="featured">
		<p>Choose datasets to build a profile for your selected area.</p>
		<p>When finished, you can download the data, charts and geography data.</p>
	</Card>
	<Card title="Download datasets" href={resolve("/download")} mode="featured">
		<p>A flexible way to explore and download datasets.</p>
		<p>Select multiple custom areas and download datasets for your own use.</p>
	</Card>
</Grid>

<Section width="wider" title="Which datasets are available?">
	<p>
		This tool includes a variety of datasets aggregated from small area data. You can find
		information on all available datasets on the
		<a href={resolve("/glossary")}>glossary page</a>.
	</p>
	<p>
		If you only need data for standard areas down to local authority level, a wider range of
		topics can also be found on <a
			href="https://www.ons.gov.uk/explore-local-statistics/"
			target="_blank"
			>Explore Local Statistics<span class="ons-u-vh"> (opens in a new tab)</span></a
		>
		<Icon type="external" />.
	</p>
</Section>

<Section width="wider" title="How does this tool produce its figures?">
	<p>
		When you select an area, the tool chooses the underlying small area geographies that most
		accurately represent it using a <a
			href="https://geoportal.statistics.gov.uk/datasets/f0aac7ccbfd04cda9eb03e353c613faa/about"
			target="_blank"
			>best-fit methodology<span class="ons-u-vh"> (opens in a new tab)</span></a
		>
		<Icon type="external" />.
	</p>
	<p>
		When you select a dataset, the data for the best-fit areas is added up (or "aggregated") to
		give you numbers that best represent the area you selected.
	</p>
	<Notice>
		Whilst most datasets in this tool are available down to the smallest Output Area (OA) level,
		some datasets are only available down to an Lower-layer Super Output Area (LSOA) level. We
		advise caution when comparing values between OA and LSOA datasets.
	</Notice>
</Section>

<Section width="wider" title="Share your feedback">
	<p>
		We value your feedback on this service. If you would like to get in touch, please email <a
			href="mailto:explore.local.statistics@ons.gov.uk">explore.local.statistics@ons.gov.uk</a
		>.
	</p>
</Section>

<style>
	:global(.page-banner .ons-hero__title-container) {
		position: relative;
		width: 100%;
	}
	:global(.page-banner .ons-hero__title-container > *),
	:global(.ons-section__text) {
		max-width: 768px;
	}
	.header-image {
		z-index: -1;
		position: absolute;
		top: -2rem;
		right: 0;
		height: calc(100% + 5.5rem);
		width: 400px;
		background: grey;
	}
	@media (max-width: 980px) {
		.header-image {
			background-image: none !important;
		}
	}
</style>
