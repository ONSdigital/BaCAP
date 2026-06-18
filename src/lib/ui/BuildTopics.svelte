<script>
	import { Accordion, AccordionItem, Checkboxes, Checkbox } from "@onsvisual/svelte-components";
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
