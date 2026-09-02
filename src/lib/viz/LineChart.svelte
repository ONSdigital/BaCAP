<script>
	import { scaleLinear, scalePoint } from "d3-scale";
	import { ascending } from "$lib/js/utils";

	let {
		data,
		xKey = "date",
		yKey = (xKey) => `${xKey}_change`,
		zKey = "areanm",
		height = 120,
		lineWidth = 2,
		base = null,
		format = (d) => `${d - 1 > 0 ? "+" : ""}${Math.round((d - 1) * 100)}`,
		dateFormat = (d) => d
	} = $props();

	function transformData(data, xDomain) {
		const indexed = {};
		const yDomain = [Infinity, -Infinity];
		for (const d of data) {
			if (!indexed[d[zKey]]) {
				indexed[d[zKey]] = {};
				indexed[d[zKey]][zKey] = d[zKey];
			}
			indexed[d[zKey]][d.date] = d.value;
		}
		for (let key in indexed) {
			for (const xVal of xDomain) {
				const yVal = indexed[key][xVal] / indexed[key][xDomain[0]];
				indexed[key][`${xVal}_change`] = yVal;
				if (yVal < yDomain[0]) yDomain[0] = yVal;
				if (yVal > yDomain[1]) yDomain[1] = yVal;
			}
		}
		return { _data: Object.values(indexed), yDomain };
	}
	function yDodge(y1, y2 = null, h = height, buffer = 24) {
		// Make sure the labels don't overlap or go outside of the vertical chart area
		const diff = Math.abs(y2 - y1);
		if (!y2 || diff > buffer) return [y1, y2];
		let ys =
			y1 < y2
				? [y1 - (buffer - diff) / 2, y2 + (buffer - diff) / 2]
				: [y1 + (buffer - diff) / 2, y2 - (buffer - diff) / 2];
		const min = Math.min(...ys);
		const max = Math.max(...ys);
		if (min < 0) return ys.map((y) => y - min);
		if (max > h) return ys.map((y) => y + h - max);
		return ys;
	}

	let xDomain = $derived([...new Set(data.map((d) => d[xKey]))].sort(ascending));
	let xVal = $derived(xDomain[xDomain.length - 1]);
	let { _data, yDomain } = $derived(transformData(data, xDomain));
	let zDomain = $derived([...new Set(_data.map((d) => d[zKey]))]);
	let xScale = $derived(scalePoint().domain(xDomain).range([0, 100]));
	let yScale = $derived(scaleLinear().domain([yDomain[0], yDomain[1]]).range([height, 0]));
	let makePath = $derived((d) => {
		let series = xDomain.map((x) => ({ x, y: d[yKey(x)] }));
		return "M" + series.map((d) => `${xScale(d.x)} ${yScale(d.y)}`).join("L");
	});

	$inspect({ _data });
</script>

<ul class="legend-block">
	{#if zDomain[1]}
		{#each zDomain as group, i}
			<li>
				<div
					class="legend-vis marker-vis"
					style:border-bottom={i == 0
						? `${lineWidth + 1.5}px solid #27A0CC`
						: `${lineWidth}px solid black`}
				></div>
				<span class={i == 0 ? "bold" : "brackets"}>{group}</span>
			</li>
		{/each}
	{/if}
</ul>

<div class="chart-block">
	<div class="line-group" style:height="{height}px">
		<div class="baseline" style:top="{yScale(1)}px"></div>
		<div class="x-scale" style:height="1rem">
			<div>{dateFormat(xDomain[0])}</div>
			<div class="tick-right">{dateFormat(xDomain[xDomain.length - 1])}</div>
		</div>
		<svg viewBox="0 0 100 {height}" preserveAspectRatio="none">
			{#each [..._data].reverse() as d, i}
				<path
					d={makePath(d)}
					vector-effect="non-scaling-stroke"
					stroke={i == _data.length - 1 ? "#27A0CC" : "black"}
					stroke-width={i == _data.length - 1 ? lineWidth + 1.5 : lineWidth}
				/>
			{/each}
		</svg>
		{#each [..._data].reverse() as d, i}
			<div
				class="point"
				class:point-black={i === 0}
				style:left="100%"
				style:top="{yScale(d[yKey(xVal)])}px"
			></div>
		{/each}
	</div>
	{#if xVal != xDomain[0]}
		{@const coords = yDodge(..._data.map((d) => yScale(d[yKey(xVal)])))}
		<div class="label-group">
			{#each coords.filter((d) => d) as coord, i}
				<div
					class="point-label {i === 0 ? 'bold' : 'brackets'}"
					style:transform="translateY(calc({coord}px - {i === 0 ? 50 : 100}%))"
				>
					{format(_data[i][yKey(xVal)])}%
				</div>
			{/each}
		</div>
	{/if}
</div>

{#if base}
	<small>{base}</small>
{/if}

<style>
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
	.chart-block {
		display: flex;
		flex-direction: row;
		margin: 18px 0 40px;
	}
	.line-group {
		display: block;
		position: relative;
		flex-grow: 1;
		width: 100%;
	}
	.x-scale {
		position: absolute;
		width: 100%;
		top: 100%;
	}
	.label-group {
		flex-shrink: 1;
	}
	.baseline {
		position: absolute;
		left: 0;
		width: 100%;
		border-top: 1px solid #555;
	}
	.x-scale {
		position: absolute;
		font-size: 0.9rem;
	}
	.x-scale > div {
		position: absolute;
		top: 0;
		line-height: normal;
		padding-top: 10px;
	}
	.x-scale > div::before {
		content: " ";
		position: absolute;
		height: 12px;
		top: 0;
		border-right: 1px solid grey;
	}
	.x-scale > div.tick-right,
	.x-scale > div.tick-right::before {
		right: 0;
	}
	.marker-vis {
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
	svg {
		width: 100%;
		height: 100%;
		overflow: visible;
	}
	path {
		fill: none;
	}
	.point {
		position: absolute;
		width: 10px;
		height: 10px;
		background-color: #27a0cc;
		border-radius: 50%;
		transform: translate(-50%, -50%);
	}
	.point-black {
		width: 8px;
		height: 8px;
		background-color: black;
	}
	.point-label {
		/* position: absolute; */
		line-height: 1;
		font-size: 16px;
		padding-left: 8px;
		transform: translateY(-50%);
	}
	.point-label.brackets {
		font-size: 0.85em;
		transform: translateY(-150%);
	}
	small {
		font-size: 14px;
		line-height: 1.3;
		display: block;
		margin-top: 8px;
		color: #707070;
	}
</style>
