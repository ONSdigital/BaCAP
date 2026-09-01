<script>
	import { groupData } from "$lib/utils.js";

	let {
		data,
		xKey = "category",
		yKey = "value",
		zKey = "areanm",
		formatTick = (num) => num.toFixed(1),
		height = 100,
		markerWidth = 2.5,
		barGap = 2,
		minmax = ["0 years", "85+"],
		base = null,
		baseExt = ", 5 year age bands",
		suffix = "%"
	} = $props();

	let xDomain = $derived([...new Set(data.map((d) => d[xKey]))]);
	let yDomain = $derived([0, Math.max(...data.map((d) => d[yKey]))]);
	let zDomain = $derived(data.map((d) => d[zKey]).filter((v, i, a) => a.indexOf(v) === i));
	let yScale = $derived((value) => Math.abs(value / yDomain[1]) * 100);

	let dataStacked = $derived(groupData(data, zKey));

	function dodgeTooltip(el) {
		const margin = 6;
		const rect = el.getBoundingClientRect();
		const parent = el.closest(".bar-group");
		if (!parent) return;
		const parentRect = parent.getBoundingClientRect();
		const offset = rect.width / 2;
		const leftDiff = rect.left - parentRect.left + margin;
		const rightDiff = rect.right - parentRect.right - margin + barGap;
		const translateX =
			rightDiff > offset ? `-${rightDiff}px` : leftDiff > offset ? "-50%" : `-${leftDiff}px`;
		el.style.transform = `translateX(${translateX})`;
	}

	// $inspect({ data, dataStacked });
</script>

<div class="profile-chart" aria-hidden="true">
	<ul class="legend-block">
		{#if zDomain[1]}
			{#each zDomain as group, i}
				<li>
					<div
						class="legend-vis {i == 0 ? 'bar' : 'marker-vis'}"
						style:border-bottom-width="{i == 0 ? 0 : markerWidth}px"
					></div>
					<span class={i == 0 ? "bold" : "brackets"}>{group}</span>
				</li>
			{/each}
		{/if}
	</ul>

	<div class="bar-group" style:height="{height}px">
		{#each dataStacked as stack, i}
			{#if i === 0}
				{#each stack.values as d, j}
					<div
						class="bar"
						style:bottom="0"
						style:height="{yScale(d[yKey])}%"
						style:left="calc({(j / xDomain.length) * 100}%)"
						style:right="calc({(1 - (j + 1) / xDomain.length) * 100}% + {barGap}px)"
					>
						<div class="tooltip-arrow"></div>
						<div
							class="tooltip"
							style:top="calc(100% + 8px)"
							style:left="50%"
							use:dodgeTooltip
						>
							{d[xKey]}: {d[yKey]}{suffix}{dataStacked[1]
								? ` (${dataStacked[1].values[j][yKey]}${suffix})`
								: ""}
						</div>
					</div>
				{/each}
			{:else}
				{#each stack.values as d, j}
					<div
						class="marker"
						style:bottom="calc({yScale(d[yKey])}% - {markerWidth / 2}px)"
						style:height="0px"
						style:left="{(j / xDomain.length) * 100}%"
						style:width="calc({(1 / xDomain.length) * 100}% - {barGap}px)"
						style:border-bottom-width="{markerWidth}px"
					></div>
				{/each}
			{/if}
		{/each}
	</div>

	<div class="x-scale" style:width="calc(100% - {barGap}px)">
		<div style:left="0">{minmax[0]}</div>
		<div style:right="0">{minmax[1]}</div>
	</div>
</div>

{#if base}
	<small>{base}{baseExt}</small>
{/if}

<style>
	.profile-chart {
		display: block;
	}
	.bold {
		font-weight: bold;
		color: #1b708f;
	}
	.brackets::before {
		content: "(";
	}
	.brackets::after {
		content: ")";
	}
	.bar-group,
	.x-scale {
		display: block;
		position: relative;
	}
	.x-scale {
		position: relative;
		border-top: 1.5px solid #555;
		font-size: 0.9rem;
		width: 100%;
		height: 1rem;
	}
	.bar-group > div {
		position: absolute;
		height: 100%;
	}
	.x-scale > div {
		position: absolute;
		top: 0;
		line-height: normal;
		padding-top: 2px;
	}
	.bar {
		background-color: #27a0cc !important;
		-webkit-print-color-adjust: exact !important;
		print-color-adjust: exact !important;
	}
	.tooltip {
		position: absolute;
		visibility: hidden;
		top: 100%;
		font-size: 14px;
		line-height: 1.4;
		white-space: nowrap;
		color: var(--ons-color-page-light);
		background: var(--ons-color-text);
		padding: 4px 6px;
		border-radius: 4px;
	}
	.tooltip-arrow {
		position: absolute;
		visibility: hidden;
		top: calc(100% + 4px);
		left: 50%;
		transform: translateX(-50%) rotate(45deg);
		width: 10px;
		height: 10px;
		background: var(--ons-color-text);
	}
	.bar:hover > .tooltip,
	.bar:hover > .tooltip-arrow {
		visibility: visible;
	}
	.marker {
		border-bottom: 2.5px solid black;
	}
	.marker-vis {
		border-bottom: 2px solid black;
		transform: translate(0, calc(3px - 0.5rem)) !important;
	}
	ul.legend-block {
		list-style-type: none;
		padding: 0;
		margin: 0 0 5px 0;
		min-height: 1rem;
	}
	ul.legend-block > li {
		display: inline-block;
		margin: 0 10px 0 0;
		padding: 0;
	}
	.legend-vis {
		display: inline-block;
		width: 1rem;
		height: 1rem;
		transform: translate(0, 3px);
	}
	small {
		font-size: 14px;
		line-height: 1.3;
		display: block;
		margin-top: 8px;
		color: #707070;
	}
</style>
