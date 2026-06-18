<script>
	import { resolve } from "$app/paths";
	import {
		Breadcrumb,
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

	let headerBackground = $state(
		`var(--ons-color-branded) right -80px top / auto 90% no-repeat url("${resolve("/img/og.png")}")`
	);
</script>

<Breadcrumb theme="blue" links={[{ label: "Home", href: "/" }]} />
<Hero
	theme="blue"
	cls="page-banner"
	title="Build a custom area profile"
	lede="Create your own profile for local areas with data for England and Wales"
	background={headerBackground}
>
	<div>
		<Button variant="ghost" icon="arrow" iconPosition="after" href={resolve("/draw")}
			>Get started</Button
		>
	</div>
</Hero>

<Section title="How to use this tool" marginTop={true}>
	<p>There are two parts to the Build a custom area profile tool:</p>
</Section>

<Grid width="wide" colWidth="wide">
	<Card title="1. Select an area" href={resolve("/draw")} mode="featured">
		<p>There are three ways to select an area:</p>
		<List mode="number">
			<Li>Search for an area in the search box.</Li>
			<Li>Draw your own area on the map.</Li>
			<Li>Upload an area boundary.</Li>
		</List>
		<p>Once you have finished selecting an area, click on the “Build profile” button.</p>
	</Card>
	<Card title="2. Build a profile" href={resolve("/build")} mode="featured">
		<p>For a selected area, you can choose datasets to build a profile.</p>
		<p>
			Your profile includes a comparison area &mdash; by default a parent area &mdash; which
			you can change or remove.
		</p>
		<p>
			When finished, you can download the data, charts and geography data from your profile.
		</p>
	</Card>
</Grid>

<Section title="Which datasets are available?">
	<p>
		This tool includes a variety of datasets aggregated from small area data. You can find
		information on all available datasets on the
		<a href={resolve("/glossary")}>glossary page</a>.
	</p>
</Section>

<Section title="How does this tool produce its figures?">
	<p>
		When you select an area, the tool chooses the underlying small area geographies that most
		accurately represent it using a <a
			href="https://geoportal.statistics.gov.uk/datasets/f0aac7ccbfd04cda9eb03e353c613faa/about"
			target="_blank"
			>best-fit methodology<span class="ons-u-vh"> (opens in a new tab)</span></a
		>
		<Icon type="external" />..
	</p>
	<p>
		When you select a dataset, the data for the best-fit areas is added up (or "aggregated") to
		give you numbers that best represent the area you selected.
	</p>
	<Notice>
		Whilst most datasets in this tool are available down to the smallest Output Area (or OA)
		level, some datasets are only available down to an LSOA level. We advise caution when
		comparing values between between Output Area and LSOA datasets.
	</Notice>
</Section>

<Section title="Share your feedback">
	<p>
		We value your feedback on this service. If you would like to get in touch, please email <a
			href="mailto:explore.local.statistics@ons.gov.uk">explore.local.statistics@ons.gov.uk</a
		>.
	</p>
</Section>

<style>
	:global(.ons-svelte-theme-wrapper) {
		overflow: visible;
		margin-top: -52px;
		padding-top: 52px;
	}
	@media (max-width: 800px) {
		:global(.ons-svelte-theme-wrapper:has(.page-banner)) {
			background-image: none !important;
		}
	}
</style>
