<script>
	import { resolve } from "$app/paths";
	import { Breadcrumb, Icon, Hero, NavSections, NavSection } from "@onsvisual/svelte-components";

	let { data } = $props();

	function slugify(string) {
		return string.toLowerCase().replaceAll(" ", "-");
	}

	function parseText(string) {
		return string.split("\n\n");
	}

	function groupTopics(indicators) {
		const topics = {};
		for (const ind of indicators.filter((ind) => ind.chart !== "line")) {
			if (!topics[ind.topic])
				topics[ind.topic] = { key: slugify(ind.topic), label: ind.topic, children: [] };
			topics[ind.topic].children.push(ind);
		}
		return Object.values(topics);
	}

	const topics = $derived(groupTopics(data.topics));
</script>

<Breadcrumb
	theme="grey"
	links={[
		{ label: "Home", href: "/", refresh: true },
		{
			label: "Build a custom area profile",
			href: resolve("/"),
			refresh: true
		}
	]}
/>
<Hero theme="grey" title="Glossary">
	<p>
		A description of all the datasets available within the <a href={resolve("/")}
			>Build a Custom Area Profile tool</a
		>.
	</p>
</Hero>
<NavSections contentsLabel="Topics" marginTop>
	{#each topics as topic, i}
		<NavSection title={topic.label} id={topic.slug}>
			<div class="indicator-item">
				{#each topic.children as ind}
					<h3 id={ind.key} class="ons-u-mt-m">{ind.label}</h3>
					{#each parseText(ind.description || ind.summary) as para}
						<p>{para}</p>
					{/each}
					{#if ind.qmi}<a class="btn-link" href={`/${ind.qmi}`} target="_blank"
							>Read more <Icon type="chevron" size="s" /></a
						>{/if}
				{/each}
			</div>
		</NavSection>
		{#if i !== topics.length - 1}<hr class="hr-full" />{/if}
	{/each}
</NavSections>

<style>
	.indicator-item h3 {
		/* font-size: 1em; */
		margin: 1.2em 0 0.5em !important;
	}
	.indicator-item :global(p),
	.indicator-item :global(li) {
		margin-bottom: 0.5em;
	}
	.hr-full {
		margin-bottom: 0.5em;
	}
</style>
