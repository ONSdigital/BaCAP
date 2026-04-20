<script>
	import { PhaseBanner, Header } from "@onsvisual/svelte-components";

	export let theme = "light";
	export let filled = true;
	export let census = false;

	let primary = theme == "dark" ? "white" : filled ? "#003c57" : "#222222";
	let secondary = theme == "dark" || filled ? "#a8bd3a" : "#222222";
	let censusColor = theme == "dark" ? "white" : "#902082";
</script>

<PhaseBanner phase="Beta" href="https://consultations.ons.gov.uk/digital-publishing/2ff010d4/consultation/intro/"/>
<Header compact />


