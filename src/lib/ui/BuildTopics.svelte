<script>
	import { resolve } from "$app/paths";
	import {
		Accordion,
		AccordionItem,
		Checkboxes,
		Checkbox,
		Icon
	} from "@onsvisual/svelte-components";
	import { slugify } from "$lib/utils.js";

	let { buildState, topics, selectedTopics = $bindable() } = $props();

	function groupTopics(topics) {
		const groups = {};
		for (const topic of topics) {
			if (!groups[topic.topic])
				groups[topic.topic] = {
					key: slugify(topic.topic),
					label: topic.topic,
					children: []
				};
			groups[topic.topic].children.push(topic);
		}
		return Object.values(groups);
	}

	function updateTopics(item) {
		const ids = topics.map((d) => d.key);
		if (item.checked)
			$selectedTopics = ids.filter((id) => $selectedTopics.includes(id) || id === item.id);
		else $selectedTopics = $selectedTopics.filter((id) => id !== item.id);
	}
</script>

<h2 class="ons-u-fs-m ons-u-mb-3xs">Select datasets</h2>
<Accordion>
	{#each groupTopics(topics, buildState.coverage) as group, i (group.key)}
		<AccordionItem title={group.label} open={i === 0}>
			<Checkboxes>
				{#each group.children as topic}
					<Checkbox
						id={topic.key}
						label={topic.label}
						checked={$selectedTopics.includes(topic.key)}
						groupName="topics"
						on:change={(e) => updateTopics(e?.detail?.item)}
						compact
					/>
				{/each}
			</Checkboxes>
		</AccordionItem>
	{/each}
</Accordion>
<hr class="section-divider ons-u-mt-no ons-u-mb-l" />
<h2 class="ons-u-fs-m">About these datasets</h2>
<p>
	More information about the definition and background of topics is available on our <a
		href={resolve("/glossary")}
		target="_blank">topic glossary</a
	>.
</p>

<h2 class="ons-u-fs-m">Looking for another topic?</h2>
<p>Only datasets published for small statistical areas can be included in this tool.</p>
<p>
	A wider range of topics can be found on <a
		href="https://www.ons.gov.uk/explore-local-statistics/"
		target="_blank"
		>Explore Local Statistics<span class="ons-u-vh"> (opens in a new tab)</span></a
	>
	<Icon type="external" />. Census data can be found on
	<a href="https://www.nomisweb.co.uk" target="_blank"
		>Nomis<span class="ons-u-vh"> (opens in a new tab)</span></a
	>
	<Icon type="external" />
	and the
	<a href="https://www.ons.gov.uk/datasets/create" target="_blank"
		>Create a custom dataset service<span class="ons-u-vh"> (opens in a new tab)</span></a
	>
	<Icon type="external" />.
</p>
