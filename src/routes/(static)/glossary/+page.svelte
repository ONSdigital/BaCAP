<script>
	import { resolve } from "$app/paths";
	import markdownit from "markdown-it";
	import { Icon, Hero, NavSections, NavSection } from "@onsvisual/svelte-components";
	import { slugify } from "$lib/utils.js";

	let { data } = $props();

	const md = markdownit();
	const parseText = (str) => md.render(str);

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

<Hero theme="grey" title="Data glossary" width="wider">
	<p>
		Information about the datasets available on the <a href={resolve("/build")}
			>Build a profile</a
		>
		and <a href={resolve("/download")}>Download datasets</a> pages.
	</p>
</Hero>
<NavSections contentsLabel="Topics" width="wider" marginTop>
	{#each topics as topic, i}
		<NavSection title={topic.label} id={topic.slug}>
			<div class="indicator-item">
				{#each topic.children as ind}
					<h3 id={ind.key} class="ons-u-mt-m">{ind.label}</h3>
					{@html parseText(ind.description || ind.summary)}
					{#if ind.url}<a
							class="btn-link"
							href={`https://www.ons.gov.uk/${ind.url}`}
							target="_blank"
							>Read more<span class="ons-u-vh"> (opens in a new tab)</span></a
						>
						<Icon type="external" />{/if}
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
