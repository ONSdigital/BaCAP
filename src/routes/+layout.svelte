<script>
	import "@onsvisual/svelte-components/css/main.css";
	import "../app.css";
	import { page } from "$app/state";
	import { resolve } from "$app/paths";
	import { beforeNavigate } from "$app/navigation";
	import { setContext } from "svelte";
	import { PhaseBanner, Header, Main, Footer } from "@onsvisual/svelte-components";
	import { baseUrl } from "$lib/config";

	let fullscreen = $state(false);
	let width = $derived(fullscreen ? "full" : "wider");

	setContext("getFullscreen", () => fullscreen);
	setContext("setFullscreen", (bool) => (fullscreen = bool || false));
	beforeNavigate(() => (fullscreen = false));

	let { children } = $props();
	$inspect({ page });
</script>

<svelte:head>
	<title>Build a custom area profile - ONS</title>
	<meta
		name="description"
		content="Create your own profile for local areas with data for England and Wales. Data topics include population, age, sex, ethnicity, religion, the work people do, and the homes they live in."
	/>
	<meta property="og:url" content="{baseUrl}{page?.url?.pathname}" />
	<meta property="og:title" content="Build a custom area profile - ONS" />
	<meta property="og:type" content="website" />
	<meta property="og:image" content="{baseUrl}/img/og.png" />
	<meta property="og:image:type" content="image/png" />
	<meta name="twitter:card" content="summary_large_image" />
	<meta
		property="og:description"
		content="Create your own profile for local areas with data for England and Wales."
	/>
	<title>Build a custom area profile - ONS</title>
</svelte:head>

{#if page?.route?.id?.includes?.("embed")}
	{@render children()}
{:else}
	{#if !fullscreen}<PhaseBanner {width} phase="Prototype" />{/if}
	{#key [page.url, fullscreen]}
		<Header
			cls={fullscreen ? "header-fullscreen" : null}
			{width}
			title="Build a custom area profile"
			compact={fullscreen}
			navLinks={fullscreen
				? null
				: [
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
	{#if !fullscreen}<Footer {width} />{/if}
{/if}

<style>
	:global(.header-fullscreen .ons-header__title) {
		margin: 0;
		font-size: 1.65rem;
	}
</style>
