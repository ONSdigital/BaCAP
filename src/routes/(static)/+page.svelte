<script>
	import { resolve } from "$app/paths";
	import {
		Header,
		Hero,
		Button,
		Section,
		Grid,
		Card,
		Footer
	} from "@onsvisual/svelte-components";
</script>

<Hero theme="blue" title="Build a custom area profile" lede="Do some cool stuff with your data.">
	<div>
		<Button variant="ghost" icon="arrow" iconPosition="after" href={resolve("/draw")}
			>Get started</Button
		>
	</div>
</Hero>

<Section marginTop={true}>
	<p>Some introductory text.</p>
</Section>

<Grid width="wide" colWidth="wide">
	<Card title="Draw" href={resolve("/draw")} mode="featured" baseline>
		Some text about draw mode.
	</Card>
	<Card title="Build" href={resolve("/build")} mode="featured" baseline>
		Some text about build mode.
	</Card>
</Grid>
