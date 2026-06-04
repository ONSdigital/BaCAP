<script>
	let {
		data,
		prefix = null,
		suffix = null,
		unit = null,
		format = suffix === "%" ? (d) => d.toFixed(1) : (d) => d.toLocaleString("en-GB"),
		highlightColor = "lightgrey"
	} = $props();
</script>

<div class="num-big">{prefix || ""}{format(data[0].value)}{suffix || ""}</div>
{#if unit}
	<div class="num-suffix">{unit}</div>
{/if}
{#if data[1]}
	<div class="num-desc" style:--highlightColor={highlightColor}>
		<mark>{data[1].value}</mark> in {data[1].areanm}
	</div>
{/if}

<style>
	.num-big {
		display: flex;
		flex-direction: row;
		justify-content: space-between;
		width: 100%;
		font-size: 3rem;
		font-weight: bold;
		line-height: 1.2;
	}
	.num-suffix {
		display: block;
		font-size: 18px;
		max-width: 100%;
		line-height: 1.1;
	}
	.num-desc {
		display: block;
		font-size: 16px;
		margin-top: 18px;
		color: #555;
		line-height: 1.6;
	}
	.num-desc mark {
		font-weight: bold;
		background: var(--highlightColor, lightgrey);
		padding: 0 4px;
	}
</style>
