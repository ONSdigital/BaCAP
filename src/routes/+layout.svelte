<script>
	import "@onsvisual/svelte-components/css/main.css";
	import "../app.css";
	import { page } from "$app/state";
	import { resolve } from "$app/paths";
	import { PhaseBanner, Header, Main, Footer } from "@onsvisual/svelte-components";

	let { children } = $props();
</script>

<svelte:head>
	<title>Build a custom area profile - ONS</title>
	<meta
		name="description"
		content="Create your own profile for local areas with data for England and Wales. Data topics include population, age, sex, ethnicity, religion, the work people do, and the homes they live in."
	/>
</svelte:head>

{#if page?.route?.id?.includes?.("embed")}
	{@render children()}
{:else}
	<PhaseBanner width="wider" phase="Prototype" />
	{#key page.url}
		<Header
			width="wider"
			title="Build a custom area profile"
			navLinks={[
				{ label: "Home", href: resolve("/") },
				{ label: "Draw an area", href: resolve("/draw") },
				{ label: "Build a profile", href: resolve("/build") },
				{ label: "Download datasets", href: resolve("/download") },
				{ label: "Data glossary", href: resolve("/glossary") }
			]}
		/>
	{/key}
	<Main>
		{@render children()}
	</Main>
	<Footer width="wider" />
{/if}
