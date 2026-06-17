<script>
	import "@onsvisual/svelte-components/css/main.css";
	import "../app.css";

	let { children } = $props();
</script>

<svelte:head>
	<title>Build a custom area profile - ONS</title>
	<meta
		name="description"
		content="Create your own profile for local areas with data for England and Wales. Data topics include population, age, sex, ethnicity, religion, the work people do, and the homes they live in."
	/>
</svelte:head>

{@render children()}
