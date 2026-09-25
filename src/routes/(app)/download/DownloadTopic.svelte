<script>
	import { resolve } from "$app/paths";
	import { Container, Em, Select, Button } from "@onsvisual/svelte-components";
	import { onsColors } from "$lib/config";

	let { topics, selectedTopic = $bindable() } = $props();

	let activeTopic = $state.raw();
</script>

<Container width="wider">
	<h2 class="ons-u-fs-m ons-u-mt-s">
		<Em mode="badge" fontSize="16px" color={onsColors.oceanBlue}>STEP 2</Em>
		<span>Select a dataset</span>
	</h2>
	<p>
		Find out more about the available datasets in the <a href={resolve("/glossary")}
			>data glossary</a
		>.
	</p>
	<form
		id="select-dataset"
		class="col-auto-width"
		onsubmit={(e) => {
			e.preventDefault();
			selectedTopic = activeTopic;
		}}
	>
		<Select
			label="Choose a dataset"
			placeholder="Select or type a dataset name"
			bind:value={activeTopic}
			options={topics}
			groupKey="topic"
		/>
		<Button cls="ons-u-mt-2xs" type="submit" small disabled={!activeTopic}
			>Select dataset</Button
		>
	</form>
</Container>

<style>
	.col-auto-width {
		width: 450px;
		max-width: calc(100vw - 58px);
	}
	.ons-u-fs-m > span {
		display: inline-block;
		transform: translateY(-2px);
	}
	h2.ons-u-fs-m {
		padding-top: 5px;
	}
</style>
