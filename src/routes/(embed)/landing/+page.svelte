<script>
	import { onMount } from "svelte";
	import { resolve } from "$app/paths";
	import { Embed, Container, Button } from "@onsvisual/svelte-components";
	import AreaSearch from "$lib/ui/AreaSearch.svelte";
	import { getAreasList } from "$lib/js/io";

	let areasList = $state.raw();
	let selectedArea = $state.raw(null);

	async function init() {
		areasList = await getAreasList(true);
	}
	onMount(init);

	$inspect({ selectedArea });
</script>

<Embed id="landing">
	<Container theme="paleblue">
		<div class="ons-u-p-l">
			<h2>Find your area</h2>
			<p>
				Find a ready-made area to start building your custom profile. Available areas
				include local authorities, wards, parishes and parliamentary constituencies.
			</p>
			{#if areasList}
				<form
					onsubmit={(e) => {
						e.preventDefault();
						window.top.location.href = resolve(`/build/#${selectedArea.id}`);
					}}
				>
					<AreaSearch
						bind:value={selectedArea}
						options={areasList}
						label="Type to select"
					/>
					<div class="ons-u-mt-2xs">
						<Button
							variant="secondary"
							disabled={!selectedArea}
							on:click={() => {
								window.top.location.href = resolve(`/draw/#${selectedArea.id}`);
							}}
							small>Edit on map</Button
						>
						<Button
							type="submit"
							icon="arrow"
							iconPosition="after"
							disabled={!selectedArea}
							small>Build profile</Button
						>
					</div>
				</form>
			{/if}
		</div>
	</Container>
</Embed>
