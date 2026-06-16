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
		Li
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
	<p>There are two steps to build your custom area profile.</p>
</Section>

<Grid width="wide" colWidth="wide">
	<Card title="Step 1 - Select an area" mode="featured" baseline>
		<p>There are three ways to select an area:</p>
		<List mode="number">
			<Li>Search for an area in the search box.</Li>
			<Li>Draw your own area on the map.</Li>
			<Li>Upload an area boundary.</Li>
		</List>
		<p>Once you have finished selecting an area, click on the “Build profile” button.</p>
	</Card>
	<Card title="Step 2 - Build a profile" mode="featured" baseline>
		<p>Once you have selected your area, you can choose datasets to build a profile.</p>
		<p>
			Your profile includes a comparison area &mdash; by default a parent area &mdash; which
			you can change or remove.
		</p>
		<p>When finished, you can download the charts and data from your profile.</p>
	</Card>
</Grid>

<Section title="Which datasets are available?">
	<p>
		This tool includes a variety of datasets that can be aggregated from small area data at an
		LSOA or Output Area level.
	</p>
	<p>
		You can find a description of all available datasets on the
		<a href={resolve("/glossary")}>glossary page</a>.
	</p>
</Section>

<Section title="How does this tool produce these figures?">
	<p>The tool takes your chosen shape and compares it to your selected datasets.</p>
	<p>
		It produces a best-fit shape, which is the closest available to your chosen shape. It adds
		up the small area data for your best-fit shape and returns it as an estimated total.
	</p>
	<p>Census 2021 topics and non-Census datasets use different small area types.</p>
	<p>
		Census 2021 topics use Output Areas (OAs) whereas non-Census datasets primarily use larger
		Lower layer Super Output Areas (LSOAs).
	</p>
	<p>
		We advise caution when comparing values between Census topics and non-Census datasets
		because these best-fit shapes will have different boundaries.
	</p>
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
